package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.PaymentMethod;
import com.parking.platform.entity.enums.PaymentStatus;
import com.parking.platform.entity.enums.SessionStatus;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A driver's own parking stay. For an ACTIVE session {@code amount} is the running charge so far;
 * once COMPLETED it is the final charge.
 */
public record MySessionResponse(
        Long id,
        String code,
        Long spaceId,
        String spaceCode,
        Long zoneId,
        String zoneName,
        Long siteId,
        String siteName,
        Long vehicleId,
        String plateNumber,
        Long reservationId,
        String reservationCode,
        SessionStatus status,
        Instant checkInAt,
        Instant checkOutAt,
        Long durationMinutes,
        BigDecimal hourlyRate,
        BigDecimal amount,
        String currency,
        PaymentStatus paymentStatus,
        PaymentMethod paymentMethod,
        String paymentRef,
        Instant paidAt
) {
}
