package com.parking.platform.repository;

import com.parking.platform.entity.SiteSurvey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SiteSurveyRepository extends JpaRepository<SiteSurvey, Long> {

    List<SiteSurvey> findAllBySiteIdOrderByCreatedAtDesc(Long siteId);

    Optional<SiteSurvey> findBySurveyJobId(String surveyJobId);
}
