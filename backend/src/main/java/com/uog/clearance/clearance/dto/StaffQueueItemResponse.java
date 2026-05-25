package com.uog.clearance.clearance.dto;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.clearance.model.ClearanceCheckStatus;
import java.math.BigDecimal;

public record StaffQueueItemResponse(
        String checkId,
        ClearanceCheckCode checkCode,
        ClearanceCheckStatus checkStatus,
        String clearanceRequestId,
        String requestNumber,
        String requestType,
        String requestStatus,
        String studentId,
        String studentName,
        String campusId,
        String submittedAt,
        String liabilityItemName,
        BigDecimal liabilityAmount,
        String liabilityCurrency,
        String liabilityDescription,
        String staffComment
) {
}
