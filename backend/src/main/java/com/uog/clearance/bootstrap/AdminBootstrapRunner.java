package com.uog.clearance.bootstrap;

import com.uog.clearance.bootstrap.config.BootstrapAdminProperties;
import com.uog.clearance.user.model.User;
import com.uog.clearance.user.model.UserRole;
import com.uog.clearance.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrapRunner implements CommandLineRunner {

    private final BootstrapAdminProperties properties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!properties.isEnabled()) {
            return;
        }

        User existing = userRepository.findByUsername(properties.getUsername()).orElse(null);
        if (existing != null) {
            existing.setPasswordHash(passwordEncoder.encode(properties.getPassword()));
            existing.setRole(UserRole.SYSTEM_ADMIN);
            existing.setActive(true);
            existing.setMustChangePassword(false);
            userRepository.save(existing);
            log.info("Refreshed SYSTEM_ADMIN bootstrap credentials for username '{}'", properties.getUsername());
            return;
        }

        User admin = new User();
        admin.setUsername(properties.getUsername());
        admin.setPasswordHash(passwordEncoder.encode(properties.getPassword()));
        admin.setRole(UserRole.SYSTEM_ADMIN);
        admin.setActive(true);
        admin.setMustChangePassword(false);
        admin.setCreatedBy("bootstrap");
        userRepository.save(admin);

        log.info("Bootstrapped initial SYSTEM_ADMIN account with username '{}'", properties.getUsername());
    }
}
