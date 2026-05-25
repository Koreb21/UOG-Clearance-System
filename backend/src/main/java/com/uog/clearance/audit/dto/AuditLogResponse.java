package com.uog.clearance.audit.dto;

import com.uog.clearance.audit.model.AuditAction;
import java.time.Instant;
import java.util.Map;

public record AuditLogResponse(
        String id,
        String actorUserId,
        String actorRole,
        String campusId,
        AuditAction action,
        String entityType,
        String entityId,
        String targetStudentId,
        String description,
        Map<String, Object> metadata,
        Instant createdAt
) {
}
