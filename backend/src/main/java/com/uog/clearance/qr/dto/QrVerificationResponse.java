package com.uog.clearance.qr.dto;

public record QrVerificationResponse(
        boolean valid,
        String clearanceRequestId,
        String studentId,
        String message
) {
}
