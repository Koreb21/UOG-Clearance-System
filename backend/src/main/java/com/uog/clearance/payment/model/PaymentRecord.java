package com.uog.clearance.payment.model;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.common.model.BaseDocument;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "payments")
public class PaymentRecord extends BaseDocument {

    private String clearanceRequestId;

    private String studentId;

    private String campusId;

    private List<String> liabilityIds;

    private PaymentProvider provider;

    @Indexed(unique = true)
    private String txRef;

    private String providerReference;

    private ClearanceCheckCode departmentCheckCode;

    private BigDecimal amount;

    private String currency = "ETB";

    private PaymentStatus status = PaymentStatus.INITIATED;

    private Map<String, Object> verificationPayload;

    private String createdBy;

    private String verifiedBy;

    private Instant verifiedAt;

    private String receiptNumber;

    private String receiptSignature;

    private Instant receiptIssuedAt;
}
