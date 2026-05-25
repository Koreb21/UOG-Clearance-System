package com.uog.clearance.auth.dto;

public record PasswordResetResponseDto(
    boolean success,
    String message
) {
}
