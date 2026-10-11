package com.parking.platform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class TimeConfig {

    /** Injected wherever "now" matters so tests can pin time. */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
