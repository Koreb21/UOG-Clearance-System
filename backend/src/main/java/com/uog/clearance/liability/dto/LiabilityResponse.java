package com.uog.clearance.liability.dto;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.liability.model.LiabilityStatus;
import java.math.BigDecimal;

public record LiabilityResponse(
        String id,
        String clearanceRequestId,
        String studentId,
        String campusId,
        ClearanceCheckCode departmentCheckCode,
        String category,
        String itemName,
        String description,
        BigDecimal amount,
        String currency,
        LiabilityStatus status,
        boolean paymentRequired
) {
}
