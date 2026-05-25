package com.uog.clearance.audit.repository;

import com.uog.clearance.audit.model.AuditLog;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    List<AuditLog> findByTargetStudentIdOrderByCreatedAtDesc(String targetStudentId);
}
