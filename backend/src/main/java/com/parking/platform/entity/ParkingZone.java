package com.parking.platform.entity;

import com.parking.platform.entity.enums.ZoneType;
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
import jakarta.persistence.UniqueConstraint;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "parking_zones",
        uniqueConstraints = @UniqueConstraint(name = "uk_zone_site_code", columnNames = {"site_id", "code"}),
        indexes = @Index(name = "idx_zone_site", columnList = "site_id")
)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
public class ParkingZone extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "site_id", nullable = false)
    private ParkingSite site;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 50)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ZoneType type = ZoneType.STRUCTURED;

    @Column(length = 50)
    private String floor;

    private Integer capacity;

    @Column(length = 500)
    private String mapImageUrl;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;
}
