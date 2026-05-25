package com.uog.clearance.auth.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        String userId,
        String username,
        String role,
        String campusId,
        boolean mustChangePassword
) {
}
