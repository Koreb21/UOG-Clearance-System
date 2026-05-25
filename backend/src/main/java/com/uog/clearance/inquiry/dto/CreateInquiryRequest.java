package com.uog.clearance.inquiry.dto;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateInquiryRequest(
        @NotBlank String clearanceRequestId,
        @NotNull ClearanceCheckCode targetCheckCode,
        @NotBlank String message
) {
}
