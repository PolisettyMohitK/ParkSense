package com.parking.platform.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.Instant;

/**
 * A site survey produced by the vision service: the metric ground model report
 * and the generated parking layout. Importing it creates PROPOSED spaces.
 */
@Entity
@Table(
        name = "site_surveys",
        indexes = {
                @Index(name = "idx_survey_site", columnList = "site_id"),
                @Index(name = "idx_survey_job", columnList = "survey_job_id")
        }
)
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
public class SiteSurvey extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "site_id", nullable = false)
    private ParkingSite site;

    @Column(name = "survey_job_id", nullable = false, length = 80)
    private String surveyJobId;

    @Column(length = 20)
    private String profile;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "completed";

    @Lob
    @Column(columnDefinition = "MEDIUMTEXT")
    private String layoutJson;

    @Lob
    @Column(columnDefinition = "MEDIUMTEXT")
    private String reportJson;

    @Builder.Default
    @Column(nullable = false)
    private boolean imported = false;

    @Column(name = "imported_space_count")
    private Integer importedSpaceCount;

    @Column(name = "imported_at")
    private Instant importedAt;
}
