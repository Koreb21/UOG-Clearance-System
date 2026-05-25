package com.uog.clearance.auth.model;

import com.uog.clearance.common.model.BaseDocument;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "password_reset_codes")
public class PasswordResetCode extends BaseDocument {

    @Indexed
    private String email;

    private String userId;

    private String codeHash;

    private Instant expiresAt;

    private Instant usedAt;
}
