package com.uog.clearance.inquiry.dto;

import com.uog.clearance.inquiry.model.InquiryStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record RespondInquiryRequest(
        @NotBlank String response,
        @NotNull InquiryStatus status
) {
}
