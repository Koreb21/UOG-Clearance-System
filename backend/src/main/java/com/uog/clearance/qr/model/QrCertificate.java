package com.uog.clearance.qr.model;

import com.uog.clearance.common.model.BaseDocument;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "qr_certificates")
public class QrCertificate extends BaseDocument {

    @Indexed
    private String clearanceRequestId;

    private String studentId;

    private String campusId;

    @Indexed
    private String hash;

    private String signedPayload;

    private String base64Qr;

    private Instant generatedAt;

    private Instant verifiedAt;

    private String verifiedBy;
}
