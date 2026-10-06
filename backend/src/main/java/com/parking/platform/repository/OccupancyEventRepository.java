package com.parking.platform.repository;

import com.parking.platform.entity.OccupancyEvent;
import com.parking.platform.entity.enums.EventSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface OccupancyEventRepository extends JpaRepository<OccupancyEvent, Long> {

    List<OccupancyEvent> findAllBySpaceIdOrderByOccurredAtDesc(Long spaceId);

    Optional<OccupancyEvent> findBySourceAndExternalId(EventSource source, String externalId);

    Optional<OccupancyEvent> findFirstBySpaceIdOrderByOccurredAtDescIdDesc(Long spaceId);

    List<OccupancyEvent> findAllByOccurredAtBetween(Instant from, Instant to);

    @Query("""
            select e from OccupancyEvent e
            where e.space.zone.id = :zoneId
              and e.occurredAt between :from and :to
            order by e.occurredAt asc
            """)
    List<OccupancyEvent> findAllByZoneAndPeriod(
            @Param("zoneId") Long zoneId,
            @Param("from") Instant from,
            @Param("to") Instant to);

    long countBySpaceIdAndState(Long spaceId, com.parking.platform.entity.enums.OccupancyState state);
}
