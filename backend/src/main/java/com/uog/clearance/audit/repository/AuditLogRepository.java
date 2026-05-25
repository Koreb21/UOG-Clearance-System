package com.uog.clearance.audit.repository;

import com.uog.clearance.audit.model.AuditLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {

    List<AuditLog> findByTargetStudentIdOrderByCreatedAtDesc(String targetStudentId);
}
