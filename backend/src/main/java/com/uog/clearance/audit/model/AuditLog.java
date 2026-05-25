package com.uog.clearance.audit.model;

import com.uog.clearance.common.model.BaseDocument;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "audit_logs")
public class AuditLog extends BaseDocument {

    private String actorUserId;

    private String actorRole;

    private String campusId;

    private AuditAction action;

    private String entityType;

    private String entityId;

    @Indexed
    private String targetStudentId;

    private String description;

    private Map<String, Object> metadata;
}
