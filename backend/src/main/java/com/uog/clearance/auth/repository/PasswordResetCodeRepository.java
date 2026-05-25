package com.uog.clearance.auth.repository;

import com.uog.clearance.auth.model.PasswordResetCode;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PasswordResetCodeRepository extends MongoRepository<PasswordResetCode, String> {

    Optional<PasswordResetCode> findTopByEmailIgnoreCaseOrderByCreatedAtDesc(String email);
}
