package com.uog.clearance.liability.dto;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CreateLiabilityRequest(
        @NotBlank String studentId,
        @NotBlank String clearanceRequestId,
        @NotNull ClearanceCheckCode departmentCheckCode,
        @NotBlank String itemName,
        String category,
        String description,
        @NotNull @DecimalMin("0.0") BigDecimal amount,
        boolean paymentRequired
) {
}
