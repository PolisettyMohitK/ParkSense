package com.parking.platform.service;

import com.parking.platform.dto.response.ParkingZoneResponse;
import com.parking.platform.dto.response.PlaceDetailResponse;
import com.parking.platform.dto.response.PlaceSummaryResponse;
import com.parking.platform.dto.response.PublicSpaceResponse;
import com.parking.platform.dto.response.PublicZoneResponse;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.enums.PlaceCategory;
import com.parking.platform.entity.enums.VerificationStatus;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ParkingSiteRepository;
import com.parking.platform.repository.ParkingZoneRepository;
import com.parking.platform.dto.response.PriceQuoteResponse;
import com.parking.platform.exception.BadRequestException;
import com.parking.platform.service.SpaceStatsService.Counts;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.Locale;

/**
 * Discovery surface for drivers: lists every registered place across
 * organizations, filtered by free-text/category and sorted by proximity.
 */
@Service
@RequiredArgsConstructor
public class PlaceService {

    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double MAX_RADIUS_KM = 50.0;
    private static final int MAX_RESULTS = 100;

    private final ParkingSiteRepository siteRepository;
    private final ParkingZoneRepository zoneRepository;
    private final ParkingSpaceRepository spaceRepository;
    private final ParkingZoneService zoneService;
    private final SpaceStatsService statsService;
    private final PricingService pricingService;
    private final PlacePhotoCatalog photoCatalog;

    @Transactional(readOnly = true)
    public List<PlaceSummaryResponse> search(
            Double latitude, Double longitude, String query, PlaceCategory category, int limit) {
        String needle = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        int cappedLimit = Math.max(1, Math.min(limit, MAX_RESULTS));

        List<ParkingSite> candidates;
        if (latitude != null && longitude != null) {
            // Bounding-box pre-filter, then exact Haversine sort.
            double latDelta = MAX_RADIUS_KM / 111.0;
            double lngDelta = MAX_RADIUS_KM / (111.0 * Math.max(0.01, Math.cos(Math.toRadians(latitude))));
            double minLat = latitude - latDelta;
            double maxLat = latitude + latDelta;
            double minLng = longitude - lngDelta;
            double maxLng = longitude + lngDelta;
            candidates = category != null
                    ? siteRepository.findActiveByCategoryWithinBounds(category, minLat, maxLat, minLng, maxLng)
                    : siteRepository.findActiveWithinBounds(minLat, maxLat, minLng, maxLng);
        } else {
            candidates = category != null
                    ? siteRepository.findAllByActiveTrueAndCategory(category)
                    : siteRepository.findAllByActiveTrue();
        }

        List<ParkingSite> matching = candidates.stream()
                .filter(site -> needle.isEmpty() || matches(site, needle))
                .toList();
        Map<Long, List<ParkingZone>> zonesBySite = zoneRepository
                .findAllBySiteIdInAndActiveTrue(matching.stream().map(ParkingSite::getId).toList())
                .stream()
                .collect(Collectors.groupingBy(zone -> zone.getSite().getId()));
        Map<Long, Counts> counts = statsService.forZones(
                zonesBySite.values().stream().flatMap(List::stream).map(ParkingZone::getId).toList());
        return matching.stream()
                .map(site -> toSummary(site, zonesBySite.getOrDefault(site.getId(), List.of()), counts, latitude, longitude))
                .sorted(comparator(latitude, longitude))
                .limit(cappedLimit)
                .toList();
    }

    @Transactional(readOnly = true)
    public PlaceDetailResponse detail(Long siteId, Double latitude, Double longitude) {
        ParkingSite site = siteRepository.findByIdAndActiveTrue(siteId)
                .orElseThrow(() -> ResourceNotFoundException.of("ParkingSite", siteId));
        List<ParkingZoneResponse> zones = zoneService.findActiveBySite(siteId);
        return new PlaceDetailResponse(
                toSummary(site, latitude, longitude),
                site.getDescription(),
                site.getOrganization() == null ? null : site.getOrganization().getContactEmail(),
                site.getOrganization() == null ? null : site.getOrganization().getContactPhone(),
                zones);
    }

    @Transactional(readOnly = true)
    public List<PublicZoneResponse> findPublicZones(Long siteId) {
        ParkingSite site = siteRepository.findByIdAndActiveTrue(siteId)
                .orElseThrow(() -> ResourceNotFoundException.of("ParkingSite", siteId));
        List<ParkingZone> zones = zoneRepository.findAllBySiteIdAndActiveTrue(site.getId());
        return zones.stream().map(this::toPublicZone).toList();
    }

    @Transactional(readOnly = true)
    public List<PublicSpaceResponse> findPublicSpaces(Long siteId, Long zoneId) {
        ParkingSite site = siteRepository.findByIdAndActiveTrue(siteId)
                .orElseThrow(() -> ResourceNotFoundException.of("ParkingSite", siteId));
        ParkingZone zone = zoneRepository.findByIdAndActiveTrue(zoneId)
                .filter(z -> z.getSite() != null && z.getSite().getId().equals(site.getId()))
                .orElseThrow(() -> ResourceNotFoundException.of("ParkingZone", zoneId));

        List<ParkingSpace> spaces = spaceRepository.findAllByZoneIdAndActiveTrueAndVerificationStatus(
                zone.getId(), VerificationStatus.VERIFIED);
        return spaces.stream().map(this::toPublicSpace).toList();
    }

    @Transactional(readOnly = true)
    public PriceQuoteResponse quote(Long siteId, Instant start, Instant end) {
        ParkingSite site = siteRepository.findByIdAndActiveTrue(siteId)
                .orElseThrow(() -> ResourceNotFoundException.of("ParkingSite", siteId));
        if (start == null || end == null || !end.isAfter(start)) {
            throw new BadRequestException("Provide a start and an end time, with end after start");
        }
        return pricingService.quote(site, start, end);
    }

    private PublicZoneResponse toPublicZone(ParkingZone zone) {
        Counts counts = statsService.forZone(zone.getId());
        long total = counts.total();
        long occupied = counts.occupied();
        long reserved = counts.reserved();
        long available = counts.available();
        return new PublicZoneResponse(
                zone.getId(),
                zone.getSite().getId(),
                zone.getName(),
                zone.getCode(),
                zone.getType(),
                zone.getFloor(),
                zone.getDescription(),
                total,
                occupied,
                available,
                reserved);
    }

    private PublicSpaceResponse toPublicSpace(ParkingSpace space) {
        return new PublicSpaceResponse(
                space.getId(),
                space.getCode(),
                space.getLabel(),
                space.getStatus(),
                space.getPositionX(),
                space.getPositionY(),
                space.getPolygon());
    }

    private boolean matches(ParkingSite site, String needle) {
        StringBuilder haystack = new StringBuilder()
                .append(site.getName()).append(' ')
                .append(site.getCity()).append(' ')
                .append(site.getAddress());
        if (site.getOrganization() != null) {
            haystack.append(' ').append(site.getOrganization().getName());
        }
        if (site.getCategory() != null) {
            haystack.append(' ').append(site.getCategory().name());
        }
        return haystack.toString().toLowerCase(Locale.ROOT).contains(needle);
    }

    private Comparator<PlaceSummaryResponse> comparator(Double latitude, Double longitude) {
        if (latitude != null && longitude != null) {
            return Comparator.comparingDouble(summary ->
                    summary.distanceKm() == null ? Double.MAX_VALUE : summary.distanceKm());
        }
        return Comparator.comparing(PlaceSummaryResponse::name, String.CASE_INSENSITIVE_ORDER);
    }

    private PlaceSummaryResponse toSummary(ParkingSite site, Double latitude, Double longitude) {
        List<ParkingZone> zones = zoneRepository.findAllBySiteIdAndActiveTrue(site.getId());
        Map<Long, Counts> counts = statsService.forZones(zones.stream().map(ParkingZone::getId).toList());
        return toSummary(site, zones, counts, latitude, longitude);
    }

    private PlaceSummaryResponse toSummary(ParkingSite site, List<ParkingZone> zones, Map<Long, Counts> countsByZone,
                                           Double latitude, Double longitude) {
        Counts counts = SpaceStatsService.sum(zones.stream()
                .map(zone -> countsByZone.getOrDefault(zone.getId(), Counts.EMPTY))
                .toList());
        long total = counts.total();
        long occupied = counts.occupied();
        long available = counts.available();
        Double distance = null;
        if (latitude != null && longitude != null && site.getLatitude() != null && site.getLongitude() != null) {
            distance = round2(haversineKm(latitude, longitude, site.getLatitude(), site.getLongitude()));
        }
        return new PlaceSummaryResponse(
                site.getId(),
                site.getName(),
                site.getOrganization() == null ? null : site.getOrganization().getName(),
                site.getCategory(),
                site.getAddress(),
                site.getCity(),
                site.getLatitude(),
                site.getLongitude(),
                distance,
                site.getCoverImageUrl(),
                site.getHourlyRate(),
                site.getOpeningHours(),
                splitAmenities(site.getAmenities()),
                zones.size(),
                total,
                available,
                occupied,
                photoCatalog.photosFor(site.getCoverImageUrl()));
    }

    private List<String> splitAmenities(String amenities) {
        if (amenities == null || amenities.isBlank()) {
            return List.of();
        }
        return Arrays.stream(amenities.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }

    private static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
