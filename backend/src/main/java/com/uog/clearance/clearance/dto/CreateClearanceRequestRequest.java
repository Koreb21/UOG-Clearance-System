package com.uog.clearance.clearance.dto;

import com.uog.clearance.clearance.model.ClearanceRequestType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateClearanceRequestRequest(
        @NotBlank String semester,
        @NotBlank String academicYearLabel,
        @NotNull ClearanceRequestType requestType
) {
}
