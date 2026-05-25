package com.uog.clearance.audit.service;

import com.uog.clearance.audit.model.AuditAction;
import com.uog.clearance.audit.model.AuditLog;
import com.uog.clearance.audit.repository.AuditLogRepository;
import com.uog.clearance.security.model.UserPrincipal;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(UserPrincipal principal,
                    AuditAction action,
                    String entityType,
                    String entityId,
                    String targetStudentId,
                    String description,
                    Map<String, Object> metadata) {
        AuditLog auditLog = new AuditLog();
        auditLog.setActorUserId(principal == null ? "SYSTEM" : principal.getId());
        auditLog.setActorRole(principal == null ? "SYSTEM" : principal.getUser().getRole().name());
        auditLog.setCampusId(principal == null ? null : principal.getCampusId());
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setTargetStudentId(targetStudentId);
        auditLog.setDescription(description);
        auditLog.setMetadata(metadata);
        auditLogRepository.save(auditLog);
    }
}
