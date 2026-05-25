package com.uog.clearance.auth.model;

import com.uog.clearance.common.model.BaseDocument;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "password_reset_codes")
public class PasswordResetCode extends BaseDocument {

    @Column(name = "email")
    private String email;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "code_hash")
    private String codeHash;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;
}

