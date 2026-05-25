package com.uog.clearance.auth.repository;

import com.uog.clearance.auth.model.PasswordResetRequest;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PasswordResetRequestRepository extends MongoRepository<PasswordResetRequest, String> {
    Optional<PasswordResetRequest> findByEmailIgnoreCase(String email);
}
