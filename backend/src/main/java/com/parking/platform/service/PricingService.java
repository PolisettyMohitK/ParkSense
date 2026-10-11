package com.parking.platform.service;

import com.parking.platform.config.BookingProperties;
import com.parking.platform.dto.response.PriceQuoteResponse;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;

/**
 * Tariff rules. A site's {@code hourlyRate} is charged per started hour with a one-hour minimum;
 * sites with no rate (cafés, restaurants, hotels that park patrons for free) are complimentary.
 */
@Service
@RequiredArgsConstructor
public class PricingService {

    private final BookingProperties properties;

    public static boolean isComplimentary(BigDecimal rate) {
        return rate == null || rate.signum() <= 0;
    }

    public static long billableHours(Duration duration) {
        long minutes = Math.max(0, duration.toMinutes());
        return Math.max(1, (minutes + 59) / 60);
    }

    public BigDecimal price(BigDecimal hourlyRate, Duration duration) {
        if (isComplimentary(hourlyRate)) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return hourlyRate.multiply(BigDecimal.valueOf(billableHours(duration))).setScale(2, RoundingMode.HALF_UP);
    }

    public BigDecimal rateFor(ParkingZone zone) {
        return zone == null || zone.getSite() == null ? null : zone.getSite().getHourlyRate();
    }

    public BigDecimal rateFor(ParkingSpace space) {
        return space == null ? null : rateFor(space.getZone());
    }

    public PriceQuoteResponse quote(ParkingSite site, Instant start, Instant end) {
        Duration duration = Duration.between(start, end);
        BigDecimal rate = site.getHourlyRate();
        return new PriceQuoteResponse(
                site.getId(),
                start,
                end,
                isComplimentary(rate),
                isComplimentary(rate) ? BigDecimal.ZERO : rate,
                billableHours(duration),
                price(rate, duration),
                properties.currency());
    }

    public String currency() {
        return properties.currency();
    }
}
