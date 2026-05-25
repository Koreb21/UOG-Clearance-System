package com.uog.clearance.clearance.model;

import com.uog.clearance.common.converter.JsonMapConverter;
import com.uog.clearance.common.model.BaseDocument;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(
    name = "clearance_checks",
    uniqueConstraints = @UniqueConstraint(
        name = "request_check_unique",
        columnNames = {"clearance_request_id", "check_code"}
    )
)
public class ClearanceCheck extends BaseDocument {

    @Column(name = "clearance_request_id")
    private String clearanceRequestId;

    @Column(name = "student_id")
    private String studentId;

    @Column(name = "campus_id")
    private String campusId;

    @Enumerated(EnumType.STRING)
    @Column(name = "check_code")
    private ClearanceCheckCode checkCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ClearanceCheckStatus status = ClearanceCheckStatus.PENDING;

    @Column(name = "assigned_department_id")
    private String assignedDepartmentId;

    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "comment")
    private String comment;

    @Convert(converter = JsonMapConverter.class)
    @Column(name = "metadata", columnDefinition = "TEXT")
    private Map<String, Object> metadata;
}
