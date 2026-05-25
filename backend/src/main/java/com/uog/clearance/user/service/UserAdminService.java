package com.uog.clearance.user.service;

import com.uog.clearance.audit.model.AuditAction;
import com.uog.clearance.audit.service.AuditLogService;
import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.user.dto.CreateStaffUserRequest;
import com.uog.clearance.user.dto.UpdateStaffUserRequest;
import com.uog.clearance.user.dto.UserResponse;
import com.uog.clearance.user.model.User;
import com.uog.clearance.user.model.UserRole;
import com.uog.clearance.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public UserResponse createStaffUser(CreateStaffUserRequest request, UserPrincipal principal) {
        if (request.role() == UserRole.STUDENT) {
            throw new IllegalArgumentException("Use the student admin endpoint to create student accounts");
        }
        String username = request.username() == null ? "" : request.username().trim();
        if (username.isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (userRepository.findByUsernameIgnoreCase(username).isPresent()) {
            throw new DuplicateKeyException("User with this username already exists");
        }
        String email = emptyToNull(request.email());
        if (email != null && userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new DuplicateKeyException("User with this email already exists");
        }

        String password = request.temporaryPassword() == null || request.temporaryPassword().isBlank()
                ? username
                : request.temporaryPassword().trim();

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(request.role());
        user.setCampusId(emptyToNull(request.campusId()));
        user.setDepartmentId(emptyToNull(request.departmentId()));
        user.setActive(true);
        user.setMustChangePassword(true);
        user.setCreatedBy(principal.getId());
        user = userRepository.save(user);

        Map<String, Object> createMeta = new java.util.LinkedHashMap<>();
        createMeta.put("username", user.getUsername());
        createMeta.put("role", user.getRole().name());
        createMeta.put("campusId", user.getCampusId());
        auditLogService.log(
                principal,
                AuditAction.USER_CREATED,
                "USER",
                user.getId(),
                null,
                "Created staff user",
                createMeta);

        return toResponse(user);
    }

    public List<UserResponse> listStaffUsers() {
        return userRepository.findAll()
                .stream()
                .filter(user -> user.getRole() != UserRole.STUDENT)
                .map(this::toResponse)
                .toList();
    }

    public UserResponse getStaffUser(String userId) {
        User user = userRepository.findById(userId)
                .filter(item -> item.getRole() != UserRole.STUDENT)
                .orElseThrow(() -> new IllegalArgumentException("Staff user not found"));
        return toResponse(user);
    }

    public UserResponse updateStaffUser(String userId, UpdateStaffUserRequest request, UserPrincipal principal) {
        if (request.role() == UserRole.STUDENT) {
            throw new IllegalArgumentException("Staff endpoint cannot assign the STUDENT role");
        }

        User user = userRepository.findById(userId)
                .filter(item -> item.getRole() != UserRole.STUDENT)
                .orElseThrow(() -> new IllegalArgumentException("Staff user not found"));
        String username = request.username() == null ? "" : request.username().trim();
        if (username.isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (!user.getUsername().equalsIgnoreCase(username)
                && userRepository.findByUsernameIgnoreCase(username).isPresent()) {
            throw new DuplicateKeyException("User with this username already exists");
        }
        String email = emptyToNull(request.email());
        if (email != null && !email.equalsIgnoreCase(user.getEmail())
                && userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new DuplicateKeyException("User with this email already exists");
        }

        user.setUsername(username);
        user.setEmail(email);
        user.setRole(request.role());
        user.setCampusId(emptyToNull(request.campusId()));
        user.setDepartmentId(emptyToNull(request.departmentId()));
        user = userRepository.save(user);

        Map<String, Object> updateMeta = new java.util.LinkedHashMap<>();
        updateMeta.put("username", user.getUsername());
        updateMeta.put("role", user.getRole().name());
        updateMeta.put("campusId", user.getCampusId());
        auditLogService.log(
                principal,
                AuditAction.USER_UPDATED,
                "USER",
                user.getId(),
                null,
                "Updated staff user",
                updateMeta);

        return toResponse(user);
    }

    public UserResponse activateStaffUser(String userId, boolean active, UserPrincipal principal) {
        User user = userRepository.findById(userId)
                .filter(item -> item.getRole() != UserRole.STUDENT)
                .orElseThrow(() -> new IllegalArgumentException("Staff user not found"));
        user.setActive(active);
        user = userRepository.save(user);

        Map<String, Object> activateMeta = new java.util.LinkedHashMap<>();
        activateMeta.put("active", active);
        activateMeta.put("username", user.getUsername());
        auditLogService.log(
                principal,
                AuditAction.USER_STATUS_CHANGED,
                "USER",
                user.getId(),
                null,
                active ? "Activated staff user" : "Deactivated staff user",
                activateMeta);

        return toResponse(user);
    }

    public UserResponse resetStaffPassword(String userId, String newPassword, UserPrincipal principal) {
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("New password is required");
        }
        User user = userRepository.findById(userId)
                .filter(item -> item.getRole() != UserRole.STUDENT)
                .orElseThrow(() -> new IllegalArgumentException("Staff user not found"));
        user.setPasswordHash(passwordEncoder.encode(newPassword.trim()));
        user.setMustChangePassword(false);
        user = userRepository.save(user);

        Map<String, Object> resetMeta = new java.util.LinkedHashMap<>();
        resetMeta.put("username", user.getUsername());
        auditLogService.log(
                principal,
                AuditAction.USER_UPDATED,
                "USER",
                user.getId(),
                null,
                "Admin reset staff password",
                resetMeta);

        return toResponse(user);
    }

    public void deleteStaffUser(String userId, UserPrincipal principal) {
        if (principal.getId().equals(userId)) {
            throw new IllegalArgumentException("You cannot delete your own account");
        }
        User user = userRepository.findById(userId)
                .filter(item -> item.getRole() != UserRole.STUDENT)
                .orElseThrow(() -> new IllegalArgumentException("Staff user not found"));
        userRepository.delete(user);

        Map<String, Object> deleteMeta = new java.util.LinkedHashMap<>();
        deleteMeta.put("username", user.getUsername());
        deleteMeta.put("role", user.getRole().name());
        auditLogService.log(
                principal,
                AuditAction.USER_DELETED,
                "USER",
                userId,
                null,
                "Deleted staff user",
                deleteMeta);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getCampusId(),
                user.getDepartmentId(),
                user.isActive(),
                user.isMustChangePassword());
    }

    private String emptyToNull(String value) {
        String trimmed = value == null ? null : value.trim();
        return trimmed == null || trimmed.isEmpty() ? null : trimmed;
    }
}
