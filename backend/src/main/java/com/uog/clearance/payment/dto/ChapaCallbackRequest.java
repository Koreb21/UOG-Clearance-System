package com.uog.clearance.payment.dto;

import jakarta.validation.constraints.NotBlank;

public record ChapaCallbackRequest(
        @NotBlank String txRef,
        @NotBlank String status,
        String providerReference,
        String message
) {
}
