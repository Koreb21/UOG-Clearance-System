package com.uog.clearance.audit.model;

import com.uog.clearance.common.converter.JsonMapConverter;
import com.uog.clearance.common.model.BaseDocument;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.Map;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "audit_logs")
public class AuditLog extends BaseDocument {

    @Column(name = "actor_user_id")
    private String actorUserId;

    @Column(name = "actor_role")
    private String actorRole;

    @Column(name = "campus_id")
    private String campusId;

    @Enumerated(EnumType.STRING)
    @Column(name = "action")
    private AuditAction action;

    @Column(name = "entity_type")
    private String entityType;

    @Column(name = "entity_id")
    private String entityId;

    @Column(name = "target_student_id")
    private String targetStudentId;

    @Column(name = "description")
    private String description;

    @Convert(converter = JsonMapConverter.class)
    @Column(name = "metadata", columnDefinition = "TEXT")
    private Map<String, Object> metadata;
}
