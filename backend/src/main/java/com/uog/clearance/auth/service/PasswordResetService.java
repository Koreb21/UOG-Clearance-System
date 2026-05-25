package com.uog.clearance.auth.service;

import com.uog.clearance.auth.dto.PasswordResetCompleteRequest;
import com.uog.clearance.auth.dto.PasswordResetRequest;
import com.uog.clearance.auth.model.PasswordResetCode;
import com.uog.clearance.auth.repository.PasswordResetCodeRepository;
import com.uog.clearance.campus.service.CampusIdNormalizer;
import com.uog.clearance.student.model.Student;
import com.uog.clearance.student.repository.StudentRepository;
import com.uog.clearance.user.model.User;
import com.uog.clearance.user.repository.UserRepository;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final int CODE_LENGTH = 6;
    private static final int EXPIRY_MINUTES = 10;

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordResetCodeRepository passwordResetCodeRepository;
    private final PasswordEncoder passwordEncoder;
    private final CampusIdNormalizer campusIdNormalizer;
    private final JavaMailSender mailSender;

    private final SecureRandom random = new SecureRandom();

    public void requestReset(PasswordResetRequest request) {
        String email = request.email() == null ? "" : request.email().trim();
        if (email.isBlank()) {
            return;
        }

        ResolvedAccount account = resolveAccountByEmail(email);
        if (account == null) {
            return;
        }

        String expectedCampus = request.expectedCampusId() == null ? null : request.expectedCampusId().trim();
        if (expectedCampus != null && !expectedCampus.isBlank()) {
            String actualCampus = campusIdNormalizer.normalizeToCode(account.campusId());
            String expectedCode = campusIdNormalizer.normalizeToCode(expectedCampus);
            if (actualCampus != null && expectedCode != null && !actualCampus.equals(expectedCode)) {
                throw new BadCredentialsException(
                        "This account is registered on a different campus. Go back and choose the correct campus tile.");
            }
        }

        String code = generateNumericCode();

        PasswordResetCode resetCode = new PasswordResetCode();
        resetCode.setEmail(email.toLowerCase(Locale.ROOT));
        resetCode.setUserId(account.userId());
        resetCode.setCodeHash(passwordEncoder.encode(code));
        resetCode.setExpiresAt(Instant.now().plus(EXPIRY_MINUTES, ChronoUnit.MINUTES));
        resetCode.setUsedAt(null);
        passwordResetCodeRepository.save(resetCode);

        sendCodeEmail(email, code);
    }

    public void verifyCode(String email, String code) {
        String emailTrimmed = email == null ? "" : email.trim();
        String codeTrimmed = code == null ? "" : code.trim();
        if (emailTrimmed.isBlank() || codeTrimmed.isBlank()) {
            throw new IllegalArgumentException("Invalid email or verification code");
        }

        PasswordResetCode saved = passwordResetCodeRepository
                .findTopByEmailIgnoreCaseOrderByCreatedAtDesc(emailTrimmed)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or verification code"));

        if (saved.getUsedAt() != null) {
            throw new IllegalArgumentException("This verification code has already been used");
        }
        if (saved.getExpiresAt() != null && saved.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Verification code expired. Request a new code.");
        }
        if (!passwordEncoder.matches(codeTrimmed, saved.getCodeHash())) {
            throw new IllegalArgumentException("Invalid email or verification code");
        }
    }

    public void completeReset(PasswordResetCompleteRequest request) {
        String email = request.email() == null ? "" : request.email().trim();
        String code = request.code() == null ? "" : request.code().trim();
        if (email.isBlank() || code.isBlank()) {
            throw new IllegalArgumentException("Invalid email or verification code");
        }

        PasswordResetCode saved = passwordResetCodeRepository
                .findTopByEmailIgnoreCaseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or verification code"));

        if (saved.getUsedAt() != null) {
            throw new IllegalArgumentException("This verification code has already been used");
        }
        if (saved.getExpiresAt() != null && saved.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Verification code expired. Request a new code.");
        }
        if (!passwordEncoder.matches(code, saved.getCodeHash())) {
            throw new IllegalArgumentException("Invalid email or verification code");
        }

        User user = userRepository.findById(saved.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);

        saved.setUsedAt(Instant.now());
        passwordResetCodeRepository.save(saved);
    }

    private ResolvedAccount resolveAccountByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .map(user -> new ResolvedAccount(user.getId(), user.getCampusId()))
                .orElseGet(() -> studentRepository.findFirstByEmailIgnoreCase(email)
                        .map(student -> new ResolvedAccount(student.getUserId(), student.getCampusId()))
                        .orElse(null));
    }

    private String generateNumericCode() {
        int max = (int) Math.pow(10, CODE_LENGTH);
        int n = random.nextInt(max);
        return String.format(Locale.ROOT, "%0" + CODE_LENGTH + "d", n);
    }

    private void sendCodeEmail(String email, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("University of Gondar Clearance System - Password Reset Code");
        message.setText("""
                Use this verification code to reset your password:

                %s

                This code expires in %d minutes.
                If you did not request a password reset, you can ignore this message.
                """.formatted(code, EXPIRY_MINUTES));
        mailSender.send(message);
    }

    private record ResolvedAccount(String userId, String campusId) {
    }
}
