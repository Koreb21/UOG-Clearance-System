package com.uog.clearance.payment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record StandalonePaymentRequest(
        @NotBlank String studentFullName,
        @NotBlank String studentId,
        String yearOfStudy,
        String department,
        @NotBlank String campusId,
        @NotNull BigDecimal amountPaid,
        @NotBlank String paymentDate,
        String referenceNumber,
        String liabilityId,
        String clearanceRequestId,
        @NotBlank String txId,
        @NotBlank String receiptNumber,
        @NotBlank String recordedBy
) {
}
