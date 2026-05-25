package com.uog.clearance.liability.model;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.common.model.BaseDocument;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "liabilities")
public class Liability extends BaseDocument {

    private String clearanceRequestId;

    @Indexed
    private String studentId;

    private String campusId;

    private ClearanceCheckCode departmentCheckCode;

    private String category;

    private String itemName;

    private String description;

    private BigDecimal amount;

    private String currency = "ETB";

    private LiabilityStatus status = LiabilityStatus.PENDING;

    private boolean paymentRequired;

    private String createdBy;

    private String updatedBy;
}
