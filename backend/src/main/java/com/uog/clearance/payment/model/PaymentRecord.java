package com.uog.clearance.payment.model;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.common.converter.JsonListConverter;
import com.uog.clearance.common.converter.JsonMapConverter;
import com.uog.clearance.common.model.BaseDocument;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "payments")
public class PaymentRecord extends BaseDocument {

    @Column(name = "clearance_request_id")
    private String clearanceRequestId;

    @Column(name = "student_id")
    private String studentId;

    @Column(name = "campus_id")
    private String campusId;

    @Convert(converter = JsonListConverter.class)
    @Column(name = "liability_ids", columnDefinition = "TEXT")
    private List<String> liabilityIds;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider")
    private PaymentProvider provider;

    @Column(name = "tx_ref", unique = true)
    private String txRef;

    @Column(name = "provider_reference")
    private String providerReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "department_check_code")
    private ClearanceCheckCode departmentCheckCode;

    @Column(name = "amount", precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency")
    private String currency = "ETB";

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private PaymentStatus status = PaymentStatus.INITIATED;

    @Convert(converter = JsonMapConverter.class)
    @Column(name = "verification_payload", columnDefinition = "TEXT")
    private Map<String, Object> verificationPayload;

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "verified_by")
    private String verifiedBy;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "receipt_number")
    private String receiptNumber;

    @Column(name = "receipt_signature")
    private String receiptSignature;

    @Column(name = "receipt_issued_at")
    private Instant receiptIssuedAt;
}
