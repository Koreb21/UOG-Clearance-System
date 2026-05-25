package com.uog.clearance.clearance.dto;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.clearance.model.ClearanceCheckStatus;
import java.time.Instant;

public record ClearanceCheckResponse(
        String id,
        String clearanceRequestId,
        ClearanceCheckCode checkCode,
        ClearanceCheckStatus status,
        String reviewedBy,
        Instant reviewedAt,
        String comment
) {
}
