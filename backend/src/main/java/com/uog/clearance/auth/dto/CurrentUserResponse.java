package com.uog.clearance.auth.dto;

public record CurrentUserResponse(
                String userId,
                String username,
                String email,
                String role,
                String campusId,
                String departmentId,
                String studentId) {
}
