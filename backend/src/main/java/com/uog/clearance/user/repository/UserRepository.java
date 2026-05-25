package com.uog.clearance.user.repository;

import com.uog.clearance.user.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByUsername(String username);

    Optional<User> findByUsernameIgnoreCase(String username);

    Optional<User> findByEmailIgnoreCase(String email);

    @Query("SELECT u FROM User u WHERE LOWER(u.username) LIKE LOWER(:pattern)")
    Optional<User> findFirstByUsernameRegexIgnoreCase(@Param("pattern") String pattern);

    @Query("SELECT u FROM User u WHERE LOWER(u.email) LIKE LOWER(:pattern)")
    Optional<User> findFirstByEmailRegexIgnoreCase(@Param("pattern") String pattern);
}
