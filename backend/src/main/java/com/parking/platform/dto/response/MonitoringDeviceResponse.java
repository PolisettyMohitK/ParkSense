package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.DeviceStatus;
import com.parking.platform.entity.enums.DeviceType;

import java.time.Instant;

public record MonitoringDeviceResponse(
        Long id,
        Long zoneId,
        String zoneName,
        String name,
        String code,
        DeviceType type,
        DeviceStatus status,
        String identifier,
        String streamUrl,
        Instant lastSeenAt,
        boolean active,
        Instant createdAt
) {
}
