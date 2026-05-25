package com.uog.clearance.auth.model;

import com.uog.clearance.common.model.BaseDocument;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "password_reset_requests")
public class PasswordResetRequest extends BaseDocument {

    @Indexed(unique = true)
    private String email;

    private String verificationCode;

    private Instant codeExpiry;

    private boolean verified = false;

    private String resetToken;

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
