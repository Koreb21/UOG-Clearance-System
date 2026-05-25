package com.uog.clearance.qr.model;

import com.uog.clearance.common.model.BaseDocument;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "qr_certificates")
public class QrCertificate extends BaseDocument {

    @Column(name = "clearance_request_id")
    private String clearanceRequestId;

    @Column(name = "student_id")
    private String studentId;

    @Column(name = "campus_id")
    private String campusId;

    @Column(name = "hash")
    private String hash;

    @Column(name = "signed_payload", columnDefinition = "TEXT")
    private String signedPayload;

    @Column(name = "base64_qr", columnDefinition = "TEXT")
    private String base64Qr;

    @Column(name = "generated_at")
    private Instant generatedAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @Column(name = "verified_by")
    private String verifiedBy;
}
