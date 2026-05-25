package com.uog.clearance.auth.repository;

import com.uog.clearance.auth.model.PasswordResetRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, String> {
    Optional<PasswordResetRequest> findByEmailIgnoreCase(String email);
}
