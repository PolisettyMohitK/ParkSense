package com.parking.platform.entity;

import com.parking.platform.entity.enums.PlaceCategory;
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

@Entity
@Table(
        name = "parking_sites",
        uniqueConstraints = @UniqueConstraint(name = "uk_site_org_code", columnNames = {"organization_id", "code"}),
        indexes = {
                @Index(name = "idx_site_org", columnList = "organization_id"),
                @Index(name = "idx_site_geo", columnList = "latitude, longitude"),
                @Index(name = "idx_site_category", columnList = "category")
        }
)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
public class ParkingSite extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(length = 255)
    private String address;

    @Column(length = 100)
    private String city;

    private Double latitude;

    private Double longitude;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private PlaceCategory category;

    @Column(length = 500)
    private String description;

    @Column(length = 255)
    private String coverImageUrl;

    @Column(precision = 8, scale = 2)
    private BigDecimal hourlyRate;

    @Column(length = 60)
    private String openingHours;

    @Column(length = 255)
    private String amenities;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;
}
