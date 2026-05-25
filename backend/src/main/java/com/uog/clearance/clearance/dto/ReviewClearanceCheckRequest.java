package com.uog.clearance.clearance.dto;

import com.uog.clearance.clearance.model.ClearanceCheckStatus;
import jakarta.validation.constraints.NotNull;

public record ReviewClearanceCheckRequest(
        @NotNull ClearanceCheckStatus status,
        String comment
) {
}
