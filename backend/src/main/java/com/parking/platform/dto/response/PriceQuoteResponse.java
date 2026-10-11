package com.parking.platform.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record PriceQuoteResponse(
        Long siteId,
        Instant startTime,
        Instant endTime,
        boolean complimentary,
        BigDecimal hourlyRate,
        long billableHours,
        BigDecimal amount,
        String currency
) {
}
