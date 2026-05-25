package com.uog.clearance.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PasswordResetRequestDto(
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    String email
) {
}
