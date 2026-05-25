package com.uog.clearance.clearance.model;

import com.uog.clearance.common.model.BaseDocument;
import java.time.Instant;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "clearance_checks")
@CompoundIndex(name = "request_check_unique", def = "{'clearanceRequestId': 1, 'checkCode': 1}")
public class ClearanceCheck extends BaseDocument {

    @Indexed
    private String clearanceRequestId;

    private String studentId;

    @Indexed
    private String campusId;

    private ClearanceCheckCode checkCode;

    private ClearanceCheckStatus status = ClearanceCheckStatus.PENDING;

    private String assignedDepartmentId;

    private String reviewedBy;

    private Instant reviewedAt;

    private String comment;

    private Map<String, Object> metadata;
}
