package com.parking.platform.entity;

import com.parking.platform.entity.enums.DeviceStatus;
import com.parking.platform.entity.enums.DeviceType;
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

import java.time.Instant;

@Entity
@Table(
        name = "monitoring_devices",
        uniqueConstraints = @UniqueConstraint(name = "uk_device_zone_code", columnNames = {"zone_id", "code"}),
        indexes = @Index(name = "idx_device_zone", columnList = "zone_id")
)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
public class MonitoringDevice extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    private ParkingZone zone;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 50)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DeviceType type = DeviceType.CAMERA;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DeviceStatus status = DeviceStatus.OFFLINE;

    @Column(length = 120)
    private String identifier;

    @Column(length = 500)
    private String streamUrl;

    private Instant lastSeenAt;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;
}
