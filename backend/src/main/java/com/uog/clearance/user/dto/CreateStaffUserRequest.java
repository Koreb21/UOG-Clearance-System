package com.uog.clearance.user.dto;

import com.uog.clearance.user.model.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateStaffUserRequest(
        @NotBlank String username,
        String email,
        @NotNull UserRole role,
        @NotBlank String campusId,
        String departmentId,
        String temporaryPassword
) {
}
