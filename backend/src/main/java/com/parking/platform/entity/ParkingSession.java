package com.parking.platform.entity;

import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.PaymentMethod;
import com.parking.platform.entity.enums.PaymentStatus;
import com.parking.platform.entity.enums.SessionStatus;
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
        name = "parking_sessions",
        uniqueConstraints = @UniqueConstraint(name = "uk_session_code", columnNames = "code"),
        indexes = {
                @Index(name = "idx_session_space", columnList = "space_id"),
                @Index(name = "idx_session_status", columnList = "status"),
                @Index(name = "idx_session_checkin", columnList = "check_in_at")
        }
)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
public class ParkingSession extends BaseEntity {

    @Column(nullable = false, length = 40)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "space_id", nullable = false)
    private ParkingSpace space;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SessionStatus status = SessionStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventSource source;

    @Column(name = "check_in_at", nullable = false)
    private Instant checkInAt;

    @Column(name = "check_out_at")
    private Instant checkOutAt;

    private Long durationMinutes;

    @Column(length = 255)
    private String note;

    /** Final charge, computed at check-out. */
    @Column(precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private PaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private PaymentMethod paymentMethod;

    @Column(length = 40)
    private String paymentRef;

    private Instant paidAt;
}
