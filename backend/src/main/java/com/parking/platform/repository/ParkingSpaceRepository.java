package com.parking.platform.repository;

import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import jakarta.persistence.LockModeType;
import com.parking.platform.entity.enums.ReservationStatus;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ParkingSpaceRepository extends JpaRepository<ParkingSpace, Long> {

    List<ParkingSpace> findAllByZoneId(Long zoneId);

    List<ParkingSpace> findAllByZoneIdAndActiveTrueAndVerificationStatus(Long zoneId, VerificationStatus verificationStatus);

    List<ParkingSpace> findAllByZoneIdAndOccupancyState(Long zoneId, OccupancyState occupancyState);

    List<ParkingSpace> findAllByZoneIdAndVerificationStatus(Long zoneId, VerificationStatus verificationStatus);

    Optional<ParkingSpace> findByZoneIdAndCode(Long zoneId, String code);

    Optional<ParkingSpace> findFirstByZoneIdAndOperationalStateAndReservedAndOccupancyStateAndActiveTrue(
            Long zoneId, OperationalState operationalState, boolean reserved, OccupancyState occupancyState);

    long countByZoneId(Long zoneId);

    long countByZoneIdAndOccupancyState(Long zoneId, OccupancyState occupancyState);

    long countByZoneIdAndOperationalStateNot(Long zoneId, OperationalState operationalState);

    long countByZoneIdAndReservedTrue(Long zoneId);

    long countByOccupancyState(OccupancyState occupancyState);

    long countByOperationalStateNot(OperationalState operationalState);

    long countByReservedTrue();

    /**
     * Per-zone status breakdown over active, verified spaces. Buckets are mutually exclusive and
     * mirror {@link ParkingSpace#getStatus()}: out-of-service, then occupied, then reserved, else available.
     */
    @Query("""
            select s.zone.id as zoneId,
                   count(s) as total,
                   sum(case when s.operationalState <> com.parking.platform.entity.enums.OperationalState.IN_SERVICE
                            then 1 else 0 end) as outOfService,
                   sum(case when s.operationalState = com.parking.platform.entity.enums.OperationalState.IN_SERVICE
                             and s.occupancyState = com.parking.platform.entity.enums.OccupancyState.OCCUPIED
                            then 1 else 0 end) as occupied,
                   sum(case when s.operationalState = com.parking.platform.entity.enums.OperationalState.IN_SERVICE
                             and s.occupancyState <> com.parking.platform.entity.enums.OccupancyState.OCCUPIED
                             and s.reserved = true
                            then 1 else 0 end) as reserved
            from ParkingSpace s
            where s.zone.id in :zoneIds
              and s.active = true
              and s.verificationStatus = com.parking.platform.entity.enums.VerificationStatus.VERIFIED
            group by s.zone.id
            """)
    List<ZoneSpaceCounts> countStatusByZone(@Param("zoneIds") Collection<Long> zoneIds);

    /**
     * Spaces in a zone that can take a booking for [start, end): bookable, and not held by an
     * overlapping reservation. When {@code requireVacant} is set (booking starts now) the space must
     * also be physically free.
     */
    @Query("""
            select s from ParkingSpace s
            where s.zone.id = :zoneId
              and s.active = true
              and s.verificationStatus = com.parking.platform.entity.enums.VerificationStatus.VERIFIED
              and s.operationalState = com.parking.platform.entity.enums.OperationalState.IN_SERVICE
              and (:requireVacant = false
                   or s.occupancyState <> com.parking.platform.entity.enums.OccupancyState.OCCUPIED)
              and not exists (
                  select r.id from Reservation r
                  where r.assignedSpace = s
                    and r.status in :statuses
                    and r.startTime < :end
                    and r.endTime > :start)
            order by s.code asc, s.id asc
            """)
    List<ParkingSpace> findBookable(
            @Param("zoneId") Long zoneId,
            @Param("start") Instant start,
            @Param("end") Instant end,
            @Param("statuses") Collection<ReservationStatus> statuses,
            @Param("requireVacant") boolean requireVacant);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from ParkingSpace s where s.id = :id")
    Optional<ParkingSpace> findByIdForUpdate(@Param("id") Long id);

    List<ParkingSpace> findAllByReservedTrue();
}
