package com.uog.clearance.user.dto;

import com.uog.clearance.user.model.UserRole;

public record UserResponse(
        String id,
        String username,
        String email,
        UserRole role,
        String campusId,
        String departmentId,
        boolean active,
        boolean mustChangePassword
) {
}
