package com.uog.clearance.user.repository;

import com.uog.clearance.user.model.User;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByUsername(String username);

    Optional<User> findByUsernameIgnoreCase(String username);

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findFirstByUsernameRegexIgnoreCase(String pattern);

    Optional<User> findFirstByEmailRegexIgnoreCase(String pattern);
}
