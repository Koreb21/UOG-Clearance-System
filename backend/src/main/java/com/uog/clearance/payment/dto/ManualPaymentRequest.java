package com.uog.clearance.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ManualPaymentRequest(
        @NotBlank String clearanceRequestId,
        @NotBlank String studentId,
        @NotEmpty List<String> liabilityIds,
        @NotBlank String providerReference,
        String note
) {
}
