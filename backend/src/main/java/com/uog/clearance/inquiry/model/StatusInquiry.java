package com.uog.clearance.inquiry.model;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.common.model.BaseDocument;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "status_inquiries")
public class StatusInquiry extends BaseDocument {

    @Column(name = "clearance_request_id")
    private String clearanceRequestId;

    @Column(name = "student_id")
    private String studentId;

    @Column(name = "campus_id")
    private String campusId;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_check_code")
    private ClearanceCheckCode targetCheckCode;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "response", columnDefinition = "TEXT")
    private String response;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private InquiryStatus status = InquiryStatus.OPEN;

    @Column(name = "responded_at")
    private Instant respondedAt;
}
