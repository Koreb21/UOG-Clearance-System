package com.uog.clearance.liability.dto;

import com.uog.clearance.liability.model.LiabilityStatus;
import jakarta.validation.constraints.NotNull;

public record ClearLiabilityRequest(
        @NotNull LiabilityStatus status,
        String note
) {
}
