package com.parking.platform.repository;

import com.parking.platform.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    List<Vehicle> findAllByOwnerId(Long ownerId);

    List<Vehicle> findAllByOwnerIdAndActiveTrue(Long ownerId);

    Optional<Vehicle> findByPlateNumber(String plateNumber);

    boolean existsByPlateNumber(String plateNumber);
}
