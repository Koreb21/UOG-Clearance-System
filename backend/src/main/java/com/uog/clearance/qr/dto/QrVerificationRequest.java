package com.uog.clearance.qr.dto;

import jakarta.validation.constraints.NotBlank;

public record QrVerificationRequest(
        @NotBlank String hash
) {
}
