package com.parking.platform.entity;

import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.SpaceStatus;
import com.parking.platform.entity.enums.VerificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.persistence.UniqueConstraint;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "parking_spaces",
        uniqueConstraints = @UniqueConstraint(name = "uk_space_zone_code", columnNames = {"zone_id", "code"}),
        indexes = {
                @Index(name = "idx_space_zone", columnList = "zone_id"),
                @Index(name = "idx_space_occupancy", columnList = "occupancy_state"),
                @Index(name = "idx_space_operational", columnList = "operational_state")
        }
)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
public class ParkingSpace extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "zone_id", nullable = false)
    private ParkingZone zone;

    @Column(length = 50)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "occupancy_state", nullable = false, length = 20)
    @Builder.Default
    private OccupancyState occupancyState = OccupancyState.VACANT;

    @Enumerated(EnumType.STRING)
    @Column(name = "operational_state", nullable = false, length = 20)
    @Builder.Default
    private OperationalState operationalState = OperationalState.IN_SERVICE;

    @Builder.Default
    @Column(nullable = false)
    private boolean reserved = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private VerificationStatus verificationStatus = VerificationStatus.VERIFIED;

    private Double positionX;

    private Double positionY;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String polygon;

    @Column(length = 255)
    private String label;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Transient
    public SpaceStatus getStatus() {
        if (operationalState != null && operationalState != OperationalState.IN_SERVICE) {
            return SpaceStatus.OUT_OF_SERVICE;
        }
        if (occupancyState == OccupancyState.OCCUPIED) {
            return SpaceStatus.OCCUPIED;
        }
        if (reserved) {
            return SpaceStatus.RESERVED;
        }
        return SpaceStatus.AVAILABLE;
    }
}
