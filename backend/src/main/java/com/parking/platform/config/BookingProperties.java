package com.parking.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.time.ZoneId;

/**
 * Tunables for the booking lifecycle and reporting.
 *
 * @param holdBefore      how long before a booking starts its space is shown as RESERVED
 * @param arrivalGrace    how late (and how early) a driver may arrive and still claim the booking
 * @param maxDuration     longest single booking
 * @param maxAdvance      how far ahead a booking may start
 * @param pastTolerance   clock-skew slack when a booking "starts now"
 * @param timezone        zone used for hour-of-day analytics
 * @param currency        ISO currency code shown with prices
 */
@ConfigurationProperties(prefix = "app.booking")
public record BookingProperties(
        Duration holdBefore,
        Duration arrivalGrace,
        Duration maxDuration,
        Duration maxAdvance,
        Duration pastTolerance,
        ZoneId timezone,
        String currency) {

    public BookingProperties {
        holdBefore = holdBefore != null ? holdBefore : Duration.ofMinutes(15);
        arrivalGrace = arrivalGrace != null ? arrivalGrace : Duration.ofMinutes(15);
        maxDuration = maxDuration != null ? maxDuration : Duration.ofHours(24);
        maxAdvance = maxAdvance != null ? maxAdvance : Duration.ofDays(30);
        pastTolerance = pastTolerance != null ? pastTolerance : Duration.ofMinutes(5);
        timezone = timezone != null ? timezone : ZoneId.of("Asia/Kolkata");
        currency = currency != null ? currency : "INR";
    }
}
