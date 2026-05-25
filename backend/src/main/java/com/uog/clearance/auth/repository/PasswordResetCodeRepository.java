package com.uog.clearance.auth.repository;

import com.uog.clearance.auth.model.PasswordResetCode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, String> {

    Optional<PasswordResetCode> findTopByEmailIgnoreCaseOrderByCreatedAtDesc(String email);
}

