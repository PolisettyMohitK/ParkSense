package com.parking.platform.dto.request;

import com.parking.platform.entity.enums.DeviceStatus;
import com.parking.platform.entity.enums.DeviceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record MonitoringDeviceRequest(
        @NotNull Long zoneId,
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 50) String code,
        DeviceType type,
        DeviceStatus status,
        @Size(max = 120) String identifier,
        @Size(max = 500) String streamUrl,
        Instant lastSeenAt,
        Boolean active
) {
}
