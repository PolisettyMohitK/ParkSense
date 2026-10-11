package com.parking.platform.entity;

import com.parking.platform.entity.enums.ReservationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(
        name = "reservations",
        uniqueConstraints = @UniqueConstraint(name = "uk_reservation_code", columnNames = "code"),
        indexes = {
                @Index(name = "idx_reservation_user", columnList = "user_id"),
                @Index(name = "idx_reservation_zone", columnList = "zone_id"),
                @Index(name = "idx_reservation_status", columnList = "status")
        }
)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
public class Reservation extends BaseEntity {

    @Column(nullable = false, length = 40)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    private ParkingZone zone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_space_id")
    private ParkingSpace assignedSpace;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ReservationStatus status = ReservationStatus.PENDING;

    @Column(nullable = false)
    private Instant startTime;

    @Column(nullable = false)
    private Instant endTime;

    /** Price quoted at booking time (null/0 for complimentary venues). */
    @Column(precision = 10, scale = 2)
    private BigDecimal estimatedAmount;
}
