package com.uog.clearance.payment.dto;

import com.uog.clearance.payment.model.PaymentProvider;
import com.uog.clearance.payment.model.PaymentStatus;
import com.uog.clearance.clearance.model.ClearanceCheckCode;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record PaymentResponse(
        String id,
        String clearanceRequestId,
        String studentId,
        List<String> liabilityIds,
        PaymentProvider provider,
        String txRef,
        String providerReference,
        ClearanceCheckCode departmentCheckCode,
        BigDecimal amount,
        String currency,
        PaymentStatus status,
        Instant verifiedAt,
        String receiptNumber,
        String receiptSignature,
        Instant receiptIssuedAt
) {
}
