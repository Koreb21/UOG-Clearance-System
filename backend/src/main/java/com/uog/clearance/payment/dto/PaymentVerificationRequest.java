package com.uog.clearance.payment.dto;

import jakarta.validation.constraints.NotBlank;

public record PaymentVerificationRequest(
        @NotBlank String status,
        String providerReference,
        String message
) {
}
