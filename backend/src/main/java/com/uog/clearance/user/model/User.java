package com.uog.clearance.user.model;

import com.uog.clearance.common.model.BaseDocument;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "users")
public class User extends BaseDocument {

    @Column(name = "username", unique = true, nullable = false)
    private String username;

    @Column(name = "email", unique = true)
    private String email;

    @Column(name = "password_hash")
    @Getter(AccessLevel.NONE)
    private String passwordHash;

    @Column(name = "legacy_password_hash")
    private String legacyPasswordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    private UserRole role;

    @Column(name = "campus_id")
    private String campusId;

    @Column(name = "department_id")
    private String departmentId;

    @Column(name = "student_id")
    private String studentId;

    @Column(name = "is_active")
    private boolean active = true;

    @Column(name = "must_change_password")
    private boolean mustChangePassword = true;

    @Column(name = "created_by")
    private String createdBy;

    public String getPasswordHash() {
        return passwordHash != null ? passwordHash : legacyPasswordHash;
    }
}
