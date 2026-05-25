package com.uog.clearance.qr.dto;

import java.time.Instant;

public record QrCertificateResponse(
        String id,
        String clearanceRequestId,
        String studentId,
        String campusId,
        String hash,
        String signedPayload,
        String base64Qr,
        Instant generatedAt
) {
}
