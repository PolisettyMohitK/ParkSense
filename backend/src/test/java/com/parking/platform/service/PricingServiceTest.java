package com.parking.platform.service;

import com.parking.platform.config.BookingProperties;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class PricingServiceTest {

    private final PricingService pricing =
            new PricingService(new BookingProperties(null, null, null, null, null, null, null));

    @Test
    void chargesPerStartedHourWithAOneHourMinimum() {
        BigDecimal rate = BigDecimal.valueOf(50);
        assertThat(pricing.price(rate, Duration.ofMinutes(0))).isEqualByComparingTo("50");
        assertThat(pricing.price(rate, Duration.ofMinutes(60))).isEqualByComparingTo("50");
        assertThat(pricing.price(rate, Duration.ofMinutes(61))).isEqualByComparingTo("100");
        assertThat(pricing.price(rate, Duration.ofHours(5))).isEqualByComparingTo("250");
    }

    @Test
    void venuesWithoutARateAreComplimentary() {
        assertThat(pricing.price(null, Duration.ofHours(3))).isEqualByComparingTo("0");
        assertThat(pricing.price(BigDecimal.ZERO, Duration.ofHours(3))).isEqualByComparingTo("0");
        assertThat(PricingService.isComplimentary(null)).isTrue();
    }

    @Test
    void defaultsToRupeesInIndianTime() {
        assertThat(pricing.currency()).isEqualTo("INR");
    }
}
