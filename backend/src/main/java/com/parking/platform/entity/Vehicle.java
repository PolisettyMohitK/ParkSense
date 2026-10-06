package com.parking.platform.entity;

import com.parking.platform.entity.enums.VehicleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "vehicles",
        indexes = {
                @Index(name = "idx_vehicle_owner", columnList = "owner_id"),
                @Index(name = "idx_vehicle_plate", columnList = "plate_number")
        }
)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
public class Vehicle extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "plate_number", nullable = false, length = 30)
    private String plateNumber;

    @Column(length = 60)
    private String make;

    @Column(length = 60)
    private String model;

    @Column(length = 30)
    private String color;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private VehicleType type = VehicleType.CAR;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;
}
