package com.uog.clearance.audit.controller;

import com.uog.clearance.audit.dto.AuditLogResponse;
import com.uog.clearance.audit.repository.AuditLogRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public List<AuditLogResponse> listLogs(@RequestParam(required = false) String targetStudentId) {
        return (targetStudentId == null || targetStudentId.isBlank()
                ? auditLogRepository.findAll()
                : auditLogRepository.findByTargetStudentIdOrderByCreatedAtDesc(targetStudentId))
                .stream()
                .map(log -> new AuditLogResponse(
                        log.getId(),
                        log.getActorUserId(),
                        log.getActorRole(),
                        log.getCampusId(),
                        log.getAction(),
                        log.getEntityType(),
                        log.getEntityId(),
                        log.getTargetStudentId(),
                        log.getDescription(),
                        log.getMetadata(),
                        log.getCreatedAt()))
                .toList();
    }
}
