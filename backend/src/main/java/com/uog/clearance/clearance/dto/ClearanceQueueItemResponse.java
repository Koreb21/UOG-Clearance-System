package com.uog.clearance.clearance.dto;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.clearance.model.ClearanceCheckStatus;
import java.math.BigDecimal;

public record ClearanceQueueItemResponse(
        String checkId,
        ClearanceCheckCode checkCode,
        ClearanceCheckStatus checkStatus,
        String clearanceRequestId,
        String requestNumber,
        String requestStatus,
        String submittedAt,
        String studentId,
        String studentName,
        String program,
        String campusId,
        BigDecimal totalFines,
        long unpaidCount,
        long liabilityCount
) {
}
