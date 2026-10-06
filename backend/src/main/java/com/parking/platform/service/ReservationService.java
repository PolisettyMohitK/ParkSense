package com.parking.platform.service;

import com.parking.platform.dto.request.ReservationRequest;
import com.parking.platform.dto.response.ReservationResponse;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.Reservation;
import com.parking.platform.entity.User;
import com.parking.platform.entity.Vehicle;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.ReservationStatus;
import com.parking.platform.exception.BadRequestException;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.ReservationMapper;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ReservationRepository;
import com.parking.platform.security.SecurityUtils;
import com.parking.platform.util.CodeGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private static final List<ReservationStatus> BLOCKING_STATUSES =
            List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE);

    private final ReservationRepository repository;
    private final ParkingSpaceRepository spaceRepository;
    private final UserService userService;
    private final VehicleService vehicleService;
    private final ParkingZoneService zoneService;
    private final ParkingSpaceService spaceService;
    private final ReservationMapper mapper;

    @Transactional(readOnly = true)
    public List<ReservationResponse> findAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> findByUser(Long userId) {
        return repository.findAllByUserId(userId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ReservationResponse findById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional
    public ReservationResponse create(ReservationRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new BadRequestException("End time must be after start time");
        }
        Long userId = SecurityUtils.isAdminOrManager() ? request.userId() : SecurityUtils.currentUserId();
        if (userId == null) {
            throw new AccessDeniedException("Cannot determine reservation owner");
        }
        User user = userService.getEntity(userId);
        Vehicle vehicle = vehicleService.getEntity(request.vehicleId());
        if (!SecurityUtils.isAdminOrManager() && vehicle.getOwner() != null
                && !vehicle.getOwner().getId().equals(userId)) {
            throw new AccessDeniedException("You can only reserve with your own vehicle");
        }
        ParkingZone zone = zoneService.getEntity(request.zoneId());

        ParkingSpace space = resolveSpace(request, zone);

        Reservation reservation = Reservation.builder()
                .code(CodeGenerator.reservationCode())
                .user(user)
                .vehicle(vehicle)
                .zone(zone)
                .assignedSpace(space)
                .status(ReservationStatus.CONFIRMED)
                .startTime(request.startTime())
                .endTime(request.endTime())
                .build();

        if (space != null) {
            space.setReserved(true);
            spaceRepository.save(space);
        }
        return mapper.toResponse(repository.save(reservation));
    }

    @Transactional
    public ReservationResponse cancel(Long id) {
        Reservation reservation = getEntity(id);
        assertCanManage(reservation);
        ensureActive(reservation);
        reservation.setStatus(ReservationStatus.CANCELLED);
        releaseSpace(reservation);
        return mapper.toResponse(repository.save(reservation));
    }

    @Transactional
    public ReservationResponse complete(Long id) {
        Reservation reservation = getEntity(id);
        assertCanManage(reservation);
        ensureActive(reservation);
        reservation.setStatus(ReservationStatus.COMPLETED);
        releaseSpace(reservation);
        return mapper.toResponse(repository.save(reservation));
    }

    @Transactional
    public void delete(Long id) {
        Reservation reservation = getEntity(id);
        assertCanManage(reservation);
        releaseSpace(reservation);
        repository.delete(reservation);
    }

    public Reservation getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Reservation", id));
    }

    private void assertCanManage(Reservation reservation) {
        if (SecurityUtils.isAdminOrManager()) {
            return;
        }
        Long currentUserId = SecurityUtils.currentUserId();
        if (currentUserId == null || reservation.getUser() == null
                || !reservation.getUser().getId().equals(currentUserId)) {
            throw new AccessDeniedException("You can only manage your own reservations");
        }
    }

    private ParkingSpace resolveSpace(ReservationRequest request, ParkingZone zone) {
        if (request.assignedSpaceId() != null) {
            ParkingSpace space = spaceService.getEntity(request.assignedSpaceId());
            if (space.getZone() == null || !space.getZone().getId().equals(zone.getId())) {
                throw new BadRequestException("Assigned space does not belong to the requested zone");
            }
            if (space.getOperationalState() != OperationalState.IN_SERVICE) {
                throw new ConflictException("Assigned space is not in service");
            }
            boolean overlapping = !repository
                    .findOverlappingForSpace(space.getId(), request.startTime(), request.endTime(), BLOCKING_STATUSES)
                    .isEmpty();
            if (overlapping) {
                throw new ConflictException("Space is already reserved for the requested period");
            }
            return space;
        }
        return spaceRepository.findFirstByZoneIdAndOperationalStateAndReservedAndOccupancyStateAndActiveTrue(
                        zone.getId(), OperationalState.IN_SERVICE, false, OccupancyState.VACANT)
                .orElse(null);
    }

    private void ensureActive(Reservation reservation) {
        if (reservation.getStatus() == ReservationStatus.CANCELLED
                || reservation.getStatus() == ReservationStatus.COMPLETED
                || reservation.getStatus() == ReservationStatus.EXPIRED) {
            throw new BadRequestException("Reservation is already " + reservation.getStatus());
        }
    }

    private void releaseSpace(Reservation reservation) {
        ParkingSpace space = reservation.getAssignedSpace();
        if (space != null && space.isReserved()) {
            space.setReserved(false);
            spaceRepository.save(space);
        }
    }
}
