package com.uog.clearance.clearance.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.uog.clearance.clearance.model.ClearanceRequestStatus;
import com.uog.clearance.student.dto.StudentIdentityResponse;
import java.time.Instant;
import java.util.List;

public record StudentClearanceOverviewResponse(
        @JsonProperty("request_id")
        String requestId,

        @JsonProperty("request_number")
        String requestNumber,

        @JsonProperty("student")
        StudentIdentityResponse student,

        @JsonProperty("status")
        ClearanceRequestStatus status,

        @JsonProperty("submitted_at")
        Instant submittedAt,

        @JsonProperty("progress_percentage")
        int progressPercentage,

        @JsonProperty("checks")
        List<ClearanceCheckResponse> checks,

        @JsonProperty("has_certificate")
        boolean hasCertificate
) {}
