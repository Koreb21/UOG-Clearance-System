package com.uog.clearance.auth.controller;

import com.uog.clearance.auth.dto.AuthResponse;
import com.uog.clearance.auth.dto.ChangePasswordRequest;
import com.uog.clearance.auth.dto.CurrentUserResponse;
import com.uog.clearance.auth.dto.LoginRequest;
import com.uog.clearance.auth.dto.PasswordResetCompleteRequest;
import com.uog.clearance.auth.dto.PasswordResetRequest;
import com.uog.clearance.auth.dto.UpdateMyProfileRequest;
import com.uog.clearance.auth.dto.VerifyResetCodeDto;
import com.uog.clearance.auth.service.AuthService;
import com.uog.clearance.auth.service.PasswordResetService;
import com.uog.clearance.security.model.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public CurrentUserResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.me(principal);
    }

    @PutMapping("/me/profile")
    public CurrentUserResponse updateMyProfile(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateMyProfileRequest request) {
        return authService.updateMyProfile(principal, request);
    }

    @PostMapping("/change-password")
    public void changePassword(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(principal, request);
    }

    @PostMapping("/request-password-reset")
    public void requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        passwordResetService.requestReset(request);
    }

    @PostMapping("/verify-reset-code")
    public void verifyResetCode(@Valid @RequestBody VerifyResetCodeDto request) {
        passwordResetService.verifyCode(request.email(), request.code());
    }

    @PostMapping("/reset-password-complete")
    public void resetPasswordComplete(@Valid @RequestBody PasswordResetCompleteRequest request) {
        passwordResetService.completeReset(request);
    }
}
