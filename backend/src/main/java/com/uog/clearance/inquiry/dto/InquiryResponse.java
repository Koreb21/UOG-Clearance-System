package com.uog.clearance.inquiry.dto;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.inquiry.model.InquiryStatus;
import java.time.Instant;

public record InquiryResponse(
        String id,
        String clearanceRequestId,
        String studentId,
        String campusId,
        ClearanceCheckCode targetCheckCode,
        String message,
        String response,
        InquiryStatus status,
        Instant respondedAt
) {
}
