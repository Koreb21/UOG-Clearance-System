package com.uog.clearance.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record InitiateChapaPaymentRequest(
        @NotBlank String clearanceRequestId,
        @NotEmpty List<String> liabilityIds
) {
}
