package com.uog.clearance.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetCompleteRequest(
        @NotBlank @Email String email,
        @NotBlank String code,
        @NotBlank @Size(min = 6, max = 128) String newPassword
) {
}

