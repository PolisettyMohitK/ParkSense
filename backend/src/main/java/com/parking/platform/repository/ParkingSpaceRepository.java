package com.parking.platform.repository;

import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.VerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ParkingSpaceRepository extends JpaRepository<ParkingSpace, Long> {

    List<ParkingSpace> findAllByZoneId(Long zoneId);

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
}
