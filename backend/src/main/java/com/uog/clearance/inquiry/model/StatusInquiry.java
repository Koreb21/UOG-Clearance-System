package com.uog.clearance.inquiry.model;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.common.model.BaseDocument;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "status_inquiries")
public class StatusInquiry extends BaseDocument {

    private String clearanceRequestId;

    @Indexed
    private String studentId;

    private String campusId;

    private ClearanceCheckCode targetCheckCode;

    private String message;

    private String response;

    private InquiryStatus status = InquiryStatus.OPEN;

    private Instant respondedAt;
}
