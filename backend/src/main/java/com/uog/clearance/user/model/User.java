package com.uog.clearance.user.model;

import com.uog.clearance.common.model.BaseDocument;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "users")
public class User extends BaseDocument {

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true)
    private String email;

    @Getter(AccessLevel.NONE)
    private String passwordHash;

    private String legacyPasswordHash;

    private UserRole role;

    private String campusId;

    private String departmentId;

    private String studentId;

    private boolean active = true;

    private boolean mustChangePassword = true;

    private String createdBy;

    public String getPasswordHash() {
        return passwordHash != null ? passwordHash : legacyPasswordHash;
    }
}
