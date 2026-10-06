package com.parking.platform.service;

import com.parking.platform.dto.response.ParkingZoneResponse;
import com.parking.platform.dto.response.PlaceDetailResponse;
import com.parking.platform.dto.response.PlaceSummaryResponse;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.PlaceCategory;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ParkingSiteRepository;
import com.parking.platform.repository.ParkingZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
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

        return candidates.stream()
                .filter(site -> needle.isEmpty() || matches(site, needle))
                .map(site -> toSummary(site, latitude, longitude))
                .sorted(comparator(latitude, longitude))
                .limit(cappedLimit)
                .toList();
    }

    @Transactional(readOnly = true)
    public PlaceDetailResponse detail(Long siteId, Double latitude, Double longitude) {
        ParkingSite site = siteRepository.findById(siteId)
                .orElseThrow(() -> ResourceNotFoundException.of("ParkingSite", siteId));
        List<ParkingZoneResponse> zones = zoneService.findBySite(siteId);
        return new PlaceDetailResponse(
                toSummary(site, latitude, longitude),
                site.getDescription(),
                site.getOrganization() == null ? null : site.getOrganization().getContactEmail(),
                site.getOrganization() == null ? null : site.getOrganization().getContactPhone(),
                zones);
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
        var zones = zoneRepository.findAllBySiteId(site.getId());
        long total = 0;
        long occupied = 0;
        for (var zone : zones) {
            total += spaceRepository.countByZoneId(zone.getId());
            occupied += spaceRepository.countByZoneIdAndOccupancyState(zone.getId(), OccupancyState.OCCUPIED);
        }
        long available = Math.max(0, total - occupied);
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
                occupied);
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
