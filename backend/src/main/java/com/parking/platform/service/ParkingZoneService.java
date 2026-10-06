package com.parking.platform.service;

import com.parking.platform.dto.request.ParkingZoneRequest;
import com.parking.platform.dto.response.ParkingZoneResponse;
import com.parking.platform.dto.response.ZoneOccupancyResponse;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.ParkingZoneMapper;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ParkingZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParkingZoneService {

    private final ParkingZoneRepository repository;
    private final ParkingSpaceRepository spaceRepository;
    private final ParkingSiteService siteService;
    private final ParkingZoneMapper mapper;

    @Transactional(readOnly = true)
    public List<ParkingZoneResponse> findAll() {
        return repository.findAll().stream().map(this::enrich).toList();
    }

    @Transactional(readOnly = true)
    public List<ParkingZoneResponse> findBySite(Long siteId) {
        return repository.findAllBySiteId(siteId).stream().map(this::enrich).toList();
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
        repository.delete(getEntity(id));
    }

    @Transactional(readOnly = true)
    public ZoneOccupancyResponse occupancy(Long zoneId) {
        ParkingZone zone = getEntity(zoneId);
        Counts counts = counts(zoneId);
        double rate = counts.total() == 0 ? 0d : (double) counts.occupied() / counts.total();
        return new ZoneOccupancyResponse(zone.getId(), zone.getName(), zone.getCode(),
                counts.total(), counts.occupied(), counts.available(), counts.reserved(),
                counts.outOfService(), rate);
    }

    public ParkingZone getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("ParkingZone", id));
    }

    private ParkingZoneResponse enrich(ParkingZone zone) {
        ParkingZoneResponse base = mapper.toResponse(zone);
        Counts counts = counts(zone.getId());
        return new ParkingZoneResponse(
                base.id(), base.siteId(), base.siteName(), base.name(), base.code(), base.type(),
                base.floor(), base.capacity(), base.mapImageUrl(), base.description(), base.active(),
                counts.total(), counts.occupied(), counts.available(), base.createdAt());
    }

    private Counts counts(Long zoneId) {
        long total = spaceRepository.countByZoneId(zoneId);
        long occupied = spaceRepository.countByZoneIdAndOccupancyState(zoneId, OccupancyState.OCCUPIED);
        long reserved = spaceRepository.countByZoneIdAndReservedTrue(zoneId);
        long outOfService = spaceRepository.countByZoneIdAndOperationalStateNot(zoneId, OperationalState.IN_SERVICE);
        long available = Math.max(0, total - occupied - reserved - outOfService);
        return new Counts(total, occupied, available, reserved, outOfService);
    }

    private record Counts(long total, long occupied, long available, long reserved, long outOfService) {
    }
}
