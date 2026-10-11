package com.parking.platform.service;

import com.parking.platform.dto.request.ParkingZoneRequest;
import com.parking.platform.dto.response.ParkingZoneResponse;
import com.parking.platform.dto.response.ZoneOccupancyResponse;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.ParkingZoneMapper;
import com.parking.platform.repository.ParkingZoneRepository;
import com.parking.platform.service.SpaceStatsService.Counts;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ParkingZoneService {

    private final ParkingZoneRepository repository;
    private final SpaceStatsService statsService;
    private final ParkingSiteService siteService;
    private final ParkingZoneMapper mapper;

    @Transactional(readOnly = true)
    public List<ParkingZoneResponse> findAll() {
        return enrichAll(repository.findAll());
    }

    @Transactional(readOnly = true)
    public List<ParkingZoneResponse> findBySite(Long siteId) {
        return enrichAll(repository.findAllBySiteId(siteId));
    }

    @Transactional(readOnly = true)
    public List<ParkingZoneResponse> findActiveBySite(Long siteId) {
        return enrichAll(repository.findAllBySiteIdAndActiveTrue(siteId));
    }

    @Transactional(readOnly = true)
    public ParkingZoneResponse findById(Long id) {
        return enrich(getEntity(id));
    }

    @Transactional
    public ParkingZoneResponse create(ParkingZoneRequest request) {
        if (repository.existsBySiteIdAndCode(request.siteId(), request.code())) {
            throw new ConflictException("Zone code already exists in site: " + request.code());
        }
        ParkingSite site = siteService.getEntity(request.siteId());
        ParkingZone entity = mapper.toEntity(request);
        entity.setSite(site);
        return enrich(repository.save(entity));
    }

    @Transactional
    public ParkingZoneResponse update(Long id, ParkingZoneRequest request) {
        ParkingZone entity = getEntity(id);
        boolean codeChanged = !entity.getCode().equals(request.code());
        boolean siteChanged = entity.getSite() == null || !entity.getSite().getId().equals(request.siteId());
        if ((codeChanged || siteChanged)
                && repository.existsBySiteIdAndCode(request.siteId(), request.code())) {
            throw new ConflictException("Zone code already exists in site: " + request.code());
        }
        mapper.updateEntity(request, entity);
        entity.setSite(siteService.getEntity(request.siteId()));
        return enrich(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        ParkingZone zone = getEntity(id);
        try {
            repository.delete(zone);
            repository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Zone has spaces, devices or bookings - deactivate it instead");
        }
    }

    @Transactional(readOnly = true)
    public ZoneOccupancyResponse occupancy(Long zoneId) {
        ParkingZone zone = getEntity(zoneId);
        Counts counts = statsService.forZone(zoneId);
        return new ZoneOccupancyResponse(zone.getId(), zone.getName(), zone.getCode(),
                counts.total(), counts.occupied(), counts.available(), counts.reserved(),
                counts.outOfService(), counts.occupancyRate());
    }

    public ParkingZone getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("ParkingZone", id));
    }

    private ParkingZoneResponse enrich(ParkingZone zone) {
        return enrich(zone, statsService.forZone(zone.getId()));
    }

    private List<ParkingZoneResponse> enrichAll(List<ParkingZone> zones) {
        Map<Long, Counts> counts = statsService.forZones(zones.stream().map(ParkingZone::getId).toList());
        return zones.stream().map(zone -> enrich(zone, counts.getOrDefault(zone.getId(), Counts.EMPTY))).toList();
    }

    private ParkingZoneResponse enrich(ParkingZone zone, Counts counts) {
        ParkingZoneResponse base = mapper.toResponse(zone);
        return new ParkingZoneResponse(
                base.id(), base.siteId(), base.siteName(), base.name(), base.code(), base.type(),
                base.floor(), base.capacity(), base.mapImageUrl(), base.description(), base.active(),
                counts.total(), counts.occupied(), counts.available(), base.createdAt());
    }
}
