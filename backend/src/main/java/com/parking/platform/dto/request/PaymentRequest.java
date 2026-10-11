package com.parking.platform.dto.request;

import com.parking.platform.entity.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;

/** Simulated settlement - the platform never receives card or account details. */
public record PaymentRequest(@NotNull PaymentMethod method) {
}
