package com.parking.platform.repository;

import com.parking.platform.entity.Reservation;
import com.parking.platform.entity.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    Optional<Reservation> findByCode(String code);

    List<Reservation> findAllByUserId(Long userId);

    List<Reservation> findAllByZoneId(Long zoneId);

    List<Reservation> findAllByStatus(ReservationStatus status);

    List<Reservation> findAllByZoneIdAndStatus(Long zoneId, ReservationStatus status);

    Optional<Reservation> findFirstByAssignedSpaceIdAndStatusInAndEndTimeAfter(
            Long spaceId, List<ReservationStatus> statuses, Instant at);

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
