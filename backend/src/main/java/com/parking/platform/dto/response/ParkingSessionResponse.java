package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.PaymentMethod;
import com.parking.platform.entity.enums.PaymentStatus;
import com.parking.platform.entity.enums.SessionStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record ParkingSessionResponse(
        Long id,
        String code,
        Long spaceId,
        String spaceCode,
        Long zoneId,
        String zoneName,
        Long vehicleId,
        String plateNumber,
        Long userId,
        String userName,
        Long reservationId,
        String reservationCode,
        SessionStatus status,
        EventSource source,
        Instant checkInAt,
        Instant checkOutAt,
        Long durationMinutes,
        String note,
        BigDecimal amount,
        PaymentStatus paymentStatus,
        PaymentMethod paymentMethod,
        String paymentRef,
        Instant paidAt
) {
}
