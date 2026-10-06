package com.parking.platform.entity;

import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.OccupancyState;
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
        name = "occupancy_events",
        uniqueConstraints = @UniqueConstraint(name = "uk_event_source_external", columnNames = {"source", "external_id"}),
        indexes = {
                @Index(name = "idx_event_space_time", columnList = "space_id, occurred_at"),
                @Index(name = "idx_event_occurred", columnList = "occurred_at"),
                @Index(name = "idx_event_source", columnList = "source")
        }
)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
public class OccupancyEvent extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "space_id", nullable = false)
    private ParkingSpace space;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OccupancyState state;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventSource source;

    private Double confidence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private User actorUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id")
    private MonitoringDevice device;

    @Column(name = "external_id", length = 120)
    private String externalId;

    @Column(length = 255)
    private String note;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;
}
