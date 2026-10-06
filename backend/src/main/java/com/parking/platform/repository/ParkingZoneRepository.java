package com.parking.platform.repository;

import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.enums.ZoneType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ParkingZoneRepository extends JpaRepository<ParkingZone, Long> {

    List<ParkingZone> findAllBySiteId(Long siteId);

    List<ParkingZone> findAllBySiteIdAndType(Long siteId, ZoneType type);

    Optional<ParkingZone> findBySiteIdAndCode(Long siteId, String code);

    boolean existsBySiteIdAndCode(Long siteId, String code);
}
