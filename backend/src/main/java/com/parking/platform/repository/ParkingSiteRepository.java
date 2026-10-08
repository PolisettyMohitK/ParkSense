package com.parking.platform.repository;

import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.enums.PlaceCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ParkingSiteRepository extends JpaRepository<ParkingSite, Long> {

    List<ParkingSite> findAllByOrganizationId(Long organizationId);

    List<ParkingSite> findAllByActiveTrue();

    Optional<ParkingSite> findByIdAndActiveTrue(Long id);

    Optional<ParkingSite> findByOrganizationIdAndCode(Long organizationId, String code);

    boolean existsByOrganizationIdAndCode(Long organizationId, String code);

    /**
     * Geospatial pre-filter for the marketplace: limits the candidate set to a
     * bounding box before exact Haversine sorting. Keeps the query cheap at scale.
     */
    @Query("""
            select s from ParkingSite s
            where s.active = true
              and s.latitude is not null
              and s.longitude is not null
              and s.latitude between :minLat and :maxLat
              and s.longitude between :minLng and :maxLng
            """)
    List<ParkingSite> findActiveWithinBounds(
            @Param("minLat") double minLat,
            @Param("maxLat") double maxLat,
            @Param("minLng") double minLng,
            @Param("maxLng") double maxLng);

    @Query("""
            select s from ParkingSite s
            where s.active = true
              and s.category = :category
              and s.latitude is not null
              and s.longitude is not null
              and s.latitude between :minLat and :maxLat
              and s.longitude between :minLng and :maxLng
            """)
    List<ParkingSite> findActiveByCategoryWithinBounds(
            @Param("category") PlaceCategory category,
            @Param("minLat") double minLat,
            @Param("maxLat") double maxLat,
            @Param("minLng") double minLng,
            @Param("maxLng") double maxLng);

    List<ParkingSite> findAllByActiveTrueAndCategory(PlaceCategory category);
}
