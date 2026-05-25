package com.uog.clearance.clearance.dto;

import com.uog.clearance.clearance.model.ClearanceRequestStatus;
import com.uog.clearance.clearance.model.ClearanceRequestType;
import java.time.Instant;

public record ClearanceRequestResponse(
        String id,
        String requestNumber,
        String studentId,
        String campusId,
        String semester,
        String academicYearLabel,
        ClearanceRequestType requestType,
        ClearanceRequestStatus status,
        Instant submittedAt
) {
}
