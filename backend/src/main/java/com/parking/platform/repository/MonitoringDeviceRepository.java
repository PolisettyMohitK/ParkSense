package com.parking.platform.repository;

import com.parking.platform.entity.MonitoringDevice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MonitoringDeviceRepository extends JpaRepository<MonitoringDevice, Long> {

    List<MonitoringDevice> findAllByZoneId(Long zoneId);

    Optional<MonitoringDevice> findByZoneIdAndCode(Long zoneId, String code);

    boolean existsByZoneIdAndCode(Long zoneId, String code);
}
