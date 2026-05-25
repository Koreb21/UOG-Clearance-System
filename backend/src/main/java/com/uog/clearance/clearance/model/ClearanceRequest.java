package com.uog.clearance.clearance.model;

import com.uog.clearance.common.model.BaseDocument;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "clearance_requests")
public class ClearanceRequest extends BaseDocument {

    @Indexed(unique = true)
    private String requestNumber;

    @Indexed
    private String studentId;

    @Indexed
    private String campusId;

    private String semester;

    private String academicYearLabel;

    private ClearanceRequestType requestType;

    private ClearanceRequestStatus status = ClearanceRequestStatus.DRAFT;

    private Instant submittedAt;

    private Instant closedAt;
}
