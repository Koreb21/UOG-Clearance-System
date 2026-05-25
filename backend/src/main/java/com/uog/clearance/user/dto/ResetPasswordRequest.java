package com.uog.clearance.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank @Size(min = 4, message = "Password must be at least 4 characters") String newPassword
) {
}
