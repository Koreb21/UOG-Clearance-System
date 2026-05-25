package com.uog.clearance.auth.service;

import com.uog.clearance.auth.dto.AuthResponse;
import com.uog.clearance.auth.dto.ChangePasswordRequest;
import com.uog.clearance.auth.dto.CurrentUserResponse;
import com.uog.clearance.auth.dto.LoginRequest;
import com.uog.clearance.auth.dto.UpdateMyProfileRequest;
import com.uog.clearance.campus.service.CampusIdNormalizer;
import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.security.service.JwtTokenService;
import com.uog.clearance.user.model.User;
import com.uog.clearance.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenService jwtTokenService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CampusIdNormalizer campusIdNormalizer;

    public AuthResponse login(LoginRequest request) {
        String loginKey = request.username().trim();
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginKey, request.password()));
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

        String expectedCampus = request.expectedCampusId() == null ? null : request.expectedCampusId().trim();
        if (expectedCampus != null && !expectedCampus.isEmpty()) {
            String userCampusId = principal.getCampusId();
            if (userCampusId != null && !userCampusId.isBlank()) {
                String actualCode = campusIdNormalizer.normalizeToCode(userCampusId);
                String expectedCode = campusIdNormalizer.normalizeToCode(expectedCampus);
                if (expectedCode == null || actualCode == null || !actualCode.equals(expectedCode)) {
                    throw new BadCredentialsException(
                            "This account is registered on a different campus. Go back and choose the correct campus tile.");
                }
            } else {
                // User has no campusId, set it to the expected campus
                User user = principal.getUser();
                user.setCampusId(expectedCampus);
                userRepository.save(user);
                // Update the principal's campusId
                ((UserPrincipal) authentication.getPrincipal()).getUser().setCampusId(expectedCampus);
            }
        }

        String token = jwtTokenService.generateToken(principal);
        String campusCode = campusIdNormalizer.normalizeToCode(principal.getCampusId());

        return new AuthResponse(
                token,
                "Bearer",
                principal.getId(),
                principal.getUsername(),
                principal.getUser().getRole().name(),
                campusCode,
                principal.getUser().isMustChangePassword());
    }

    public CurrentUserResponse me(UserPrincipal principal) {
        return new CurrentUserResponse(
                principal.getId(),
                principal.getUsername(),
                principal.getUser().getEmail(),
                principal.getUser().getRole().name(),
                campusIdNormalizer.normalizeToCode(principal.getCampusId()),
                principal.getDepartmentId(),
                principal.getStudentId());
    }

    public CurrentUserResponse updateMyProfile(UserPrincipal principal, UpdateMyProfileRequest request) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.email() != null && !request.email().isBlank()) {
            user.setEmail(request.email().trim());
        }

        user = userRepository.save(user);

        return new CurrentUserResponse(
                principal.getId(),
                principal.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                campusIdNormalizer.normalizeToCode(principal.getCampusId()),
                principal.getDepartmentId(),
                principal.getStudentId());
    }

    public void changePassword(UserPrincipal principal, ChangePasswordRequest request) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);
    }
}
