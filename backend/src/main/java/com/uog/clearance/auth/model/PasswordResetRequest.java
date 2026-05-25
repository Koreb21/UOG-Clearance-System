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
@Table(name = "password_reset_requests")
public class PasswordResetRequest extends BaseDocument {

    @Column(name = "email", unique = true)
    private String email;

    @Column(name = "verification_code")
    private String verificationCode;

    @Column(name = "code_expiry")
    private Instant codeExpiry;

    @Column(name = "is_verified")
    private boolean verified = false;

    @Column(name = "reset_token")
    private String resetToken;

    @Column(name = "token_expiry")
    private Instant tokenExpiry;

    public PasswordResetRequest() {
    }

    public PasswordResetRequest(String email, String verificationCode, Instant codeExpiry) {
        this.email = email;
        this.verificationCode = verificationCode;
        this.codeExpiry = codeExpiry;
        this.verified = false;
    }

    public boolean isCodeExpired() {
        return Instant.now().isAfter(codeExpiry);
    }

    public boolean isTokenExpired() {
        return tokenExpiry != null && Instant.now().isAfter(tokenExpiry);
    }
}
