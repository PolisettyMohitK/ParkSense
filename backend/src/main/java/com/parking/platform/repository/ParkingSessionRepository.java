package com.parking.platform.repository;

import com.parking.platform.entity.ParkingSession;
import com.parking.platform.entity.enums.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ParkingSessionRepository extends JpaRepository<ParkingSession, Long> {

    Optional<ParkingSession> findByCode(String code);

    List<ParkingSession> findAllByOrderByCheckInAtDesc();

    List<ParkingSession> findAllByStatusOrderByCheckInAtDesc(SessionStatus status);

    List<ParkingSession> findAllBySpaceIdOrderByCheckInAtDesc(Long spaceId);

    List<ParkingSession> findAllByUserIdOrderByCheckInAtDesc(Long userId);

    Optional<ParkingSession> findFirstByUserIdAndStatusOrderByCheckInAtDesc(Long userId, SessionStatus status);

    Optional<ParkingSession> findFirstBySpaceIdAndStatusOrderByCheckInAtDesc(Long spaceId, SessionStatus status);

    long countByStatus(SessionStatus status);

    @Query("select avg(s.durationMinutes) from ParkingSession s where s.status = 'COMPLETED' and s.durationMinutes is not null")
    Double averageCompletedDurationMinutes();
}
