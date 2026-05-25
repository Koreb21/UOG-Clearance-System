package com.uog.clearance.liability.model;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.common.model.BaseDocument;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "liabilities")
public class Liability extends BaseDocument {

    @Column(name = "clearance_request_id")
    private String clearanceRequestId;

    @Column(name = "student_id")
    private String studentId;

    @Column(name = "campus_id")
    private String campusId;

    @Enumerated(EnumType.STRING)
    @Column(name = "department_check_code")
    private ClearanceCheckCode departmentCheckCode;

    @Column(name = "category")
    private String category;

    @Column(name = "item_name")
    private String itemName;

    @Column(name = "description")
    private String description;

    @Column(name = "amount", precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency")
    private String currency = "ETB";

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private LiabilityStatus status = LiabilityStatus.PENDING;

    @Column(name = "payment_required")
    private boolean paymentRequired;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "updated_by")
    private String updatedBy;
}
