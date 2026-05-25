package com.uog.clearance.qr.controller;

import com.uog.clearance.clearance.dto.SendCertificateRequest;
import com.uog.clearance.qr.dto.QrCertificateResponse;
import com.uog.clearance.qr.dto.QrVerificationRequest;
import com.uog.clearance.qr.dto.QrVerificationResponse;
import com.uog.clearance.qr.service.QrCertificateService;
import com.uog.clearance.security.model.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RegistrarController {

    private final QrCertificateService qrCertificateService;

    @GetMapping("/students/me/clearance-requests/{requestId}/certificate")
    @PreAuthorize("hasRole('STUDENT')")
    public QrCertificateResponse getStudentCertificate(@AuthenticationPrincipal UserPrincipal principal,
                                                       @PathVariable String requestId) {
        return qrCertificateService.getForStudent(principal, requestId);
    }

    @PostMapping("/registrar/clearance-requests/{requestId}/generate-certificate")
    @PreAuthorize("hasAnyRole('MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public QrCertificateResponse generateCertificate(@AuthenticationPrincipal UserPrincipal principal,
                                                     @PathVariable String requestId) {
        return qrCertificateService.generateForRequest(principal, requestId);
    }

    @PostMapping("/registrar/clearance-requests/{requestId}/send-certificate")
    @PreAuthorize("hasAnyRole('MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public void sendCertificateToStudent(@AuthenticationPrincipal UserPrincipal principal,
                                         @PathVariable String requestId,
                                         @Valid @RequestBody SendCertificateRequest request) {
        qrCertificateService.sendCertificateToStudent(principal, requestId, request.notificationMessage());
    }

    @PostMapping("/registrar/qr/verify")
    @PreAuthorize("hasAnyRole('MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public QrVerificationResponse verifyQr(@AuthenticationPrincipal UserPrincipal principal,
                                           @Valid @RequestBody QrVerificationRequest request) {
        return qrCertificateService.verify(principal, request);
    }

    @PostMapping("/registrar/clearance-requests/{requestId}/close")
    @PreAuthorize("hasAnyRole('MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public void closeRequest(@AuthenticationPrincipal UserPrincipal principal,
                             @PathVariable String requestId) {
        qrCertificateService.closeByRegistrar(principal, requestId);
    }
}
