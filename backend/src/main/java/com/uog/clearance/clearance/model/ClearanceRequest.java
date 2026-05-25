package com.uog.clearance.clearance.model;

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
@Table(name = "clearance_requests")
public class ClearanceRequest extends BaseDocument {

    @Column(name = "request_number", unique = true)
    private String requestNumber;

    @Column(name = "student_id")
    private String studentId;

    @Column(name = "campus_id")
    private String campusId;

    @Column(name = "semester")
    private String semester;

    @Column(name = "academic_year_label")
    private String academicYearLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type")
    private ClearanceRequestType requestType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ClearanceRequestStatus status = ClearanceRequestStatus.DRAFT;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "closed_at")
    private Instant closedAt;
}
