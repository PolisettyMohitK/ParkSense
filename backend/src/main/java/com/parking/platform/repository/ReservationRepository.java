package com.parking.platform.repository;

import com.parking.platform.entity.Reservation;
import com.parking.platform.entity.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    Optional<Reservation> findByCode(String code);

    List<Reservation> findAllByUserId(Long userId);

    List<Reservation> findAllByZoneId(Long zoneId);

    List<Reservation> findAllByStatus(ReservationStatus status);

    List<Reservation> findAllByZoneIdAndStatus(Long zoneId, ReservationStatus status);

    boolean existsByVehicleId(Long vehicleId);

    long countByStatusIn(Collection<ReservationStatus> statuses);

    List<Reservation> findAllByStatusAndStartTimeBefore(ReservationStatus status, Instant cutoff);

    List<Reservation> findAllByStatusAndStartTimeLessThanEqualAndEndTimeAfter(
            ReservationStatus status, Instant startedBy, Instant endsAfter);

    /**
     * Reservations a car arriving at {@code at} on this space can belong to: the booking window must
     * already be open (allowing an early-arrival grace) and not yet over. Earliest booking first.
     */
    @Query("""
            select r from Reservation r
            where r.assignedSpace.id = :spaceId
              and r.status in :statuses
              and r.startTime <= :latestStart
              and r.endTime > :at
            order by r.startTime asc
            """)
    List<Reservation> findLinkableForSpace(
            @Param("spaceId") Long spaceId,
            @Param("at") Instant at,
            @Param("latestStart") Instant latestStart,
            @Param("statuses") Collection<ReservationStatus> statuses);

    /** Whether some booking currently holds the space (checked in, or about to start). */
    @Query("""
            select count(r) > 0 from Reservation r
            where r.assignedSpace.id = :spaceId
              and (r.status = com.parking.platform.entity.enums.ReservationStatus.ACTIVE
                   or (r.status = com.parking.platform.entity.enums.ReservationStatus.CONFIRMED
                       and r.startTime <= :holdUntil
                       and r.endTime > :now))
            """)
    boolean isSpaceHeld(@Param("spaceId") Long spaceId, @Param("now") Instant now, @Param("holdUntil") Instant holdUntil);

    @Query("""
            select r from Reservation r
            where r.vehicle.id = :vehicleId
              and r.status in :statuses
              and r.startTime < :end
              and r.endTime > :start
            """)
    List<Reservation> findOverlappingForVehicle(
            @Param("vehicleId") Long vehicleId,
            @Param("start") Instant start,
            @Param("end") Instant end,
            @Param("statuses") Collection<ReservationStatus> statuses);

    @Query("""
            select r from Reservation r
            where r.zone.id = :zoneId
              and r.status in :statuses
              and r.startTime < :end
              and r.endTime > :start
            """)
    List<Reservation> findOverlapping(
            @Param("zoneId") Long zoneId,
            @Param("start") Instant start,
            @Param("end") Instant end,
            @Param("statuses") List<ReservationStatus> statuses);

    @Query("""
            select r from Reservation r
            where r.assignedSpace.id = :spaceId
              and r.status in :statuses
              and r.startTime < :end
              and r.endTime > :start
            """)
    List<Reservation> findOverlappingForSpace(
            @Param("spaceId") Long spaceId,
            @Param("start") Instant start,
            @Param("end") Instant end,
            @Param("statuses") List<ReservationStatus> statuses);
}
