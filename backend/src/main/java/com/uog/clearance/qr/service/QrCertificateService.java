package com.uog.clearance.qr.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.uog.clearance.audit.model.AuditAction;
import com.uog.clearance.audit.service.AuditLogService;
import com.uog.clearance.clearance.model.ClearanceCheck;
import com.uog.clearance.clearance.model.ClearanceCheckStatus;
import com.uog.clearance.clearance.model.ClearanceRequest;
import com.uog.clearance.clearance.model.ClearanceRequestStatus;
import com.uog.clearance.clearance.repository.ClearanceCheckRepository;
import com.uog.clearance.clearance.repository.ClearanceRequestRepository;
import com.uog.clearance.qr.config.QrProperties;
import com.uog.clearance.qr.dto.QrCertificateResponse;
import com.uog.clearance.qr.dto.QrVerificationRequest;
import com.uog.clearance.qr.dto.QrVerificationResponse;
import com.uog.clearance.qr.model.QrCertificate;
import com.uog.clearance.qr.repository.QrCertificateRepository;
import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.security.service.CampusAccessService;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class QrCertificateService {

    private final QrCertificateRepository qrCertificateRepository;
    private final ClearanceRequestRepository clearanceRequestRepository;
    private final ClearanceCheckRepository clearanceCheckRepository;
    private final CampusAccessService campusAccessService;
    private final AuditLogService auditLogService;
    private final QrProperties qrProperties;

    public QrCertificateResponse generateForRequest(UserPrincipal principal, String clearanceRequestId) {
        ClearanceRequest request = getRequest(clearanceRequestId);
        campusAccessService.requireStudentAccess(principal, request.getStudentId());

        List<ClearanceCheck> checks = clearanceCheckRepository.findByClearanceRequestId(clearanceRequestId);
        ensureReadyForQr(checks);

        QrCertificate existing = qrCertificateRepository.findByClearanceRequestId(clearanceRequestId).orElse(null);
        if (existing != null) {
            return toResponse(existing);
        }

        String hash = hash(request.getStudentId() + ":" + request.getAcademicYearLabel() + ":" + clearanceRequestId);
        String signedPayload = signPayload(request);
        String base64Qr = generateBase64Qr(signedPayload);

        QrCertificate certificate = new QrCertificate();
        certificate.setClearanceRequestId(clearanceRequestId);
        certificate.setStudentId(request.getStudentId());
        certificate.setCampusId(request.getCampusId());
        certificate.setHash(hash);
        certificate.setSignedPayload(signedPayload);
        certificate.setBase64Qr(base64Qr);
        certificate.setGeneratedAt(Instant.now());
        certificate = qrCertificateRepository.save(certificate);

        request.setStatus(ClearanceRequestStatus.CLEARED);
        clearanceRequestRepository.save(request);

        auditLogService.log(
                principal,
                AuditAction.QR_GENERATED,
                "QR_CERTIFICATE",
                certificate.getId(),
                request.getStudentId(),
                "Generated QR certificate",
                Map.of("clearanceRequestId", clearanceRequestId, "hash", certificate.getHash()));

        return toResponse(certificate);
    }

    public QrCertificateResponse getForStudent(UserPrincipal principal, String clearanceRequestId) {
        ClearanceRequest request = getRequest(clearanceRequestId);
        if (principal.getStudentId() == null || !principal.getStudentId().equals(request.getStudentId())) {
            throw new IllegalArgumentException("QR certificate not found for this student");
        }
        return qrCertificateRepository.findByClearanceRequestId(clearanceRequestId)
                .map(this::toResponse)
                .orElseThrow(() -> new IllegalArgumentException("QR certificate not found"));
    }

    public QrVerificationResponse verify(UserPrincipal principal, QrVerificationRequest request) {
        QrCertificate certificate = qrCertificateRepository.findByHash(request.hash())
                .orElseThrow(() -> new IllegalArgumentException("QR certificate not found"));
        ClearanceRequest clearanceRequest = getRequest(certificate.getClearanceRequestId());
        campusAccessService.requireStudentAccess(principal, clearanceRequest.getStudentId());

        certificate.setVerifiedAt(Instant.now());
        certificate.setVerifiedBy(principal.getId());
        qrCertificateRepository.save(certificate);

        auditLogService.log(
                principal,
                AuditAction.QR_VERIFIED,
                "QR_CERTIFICATE",
                certificate.getId(),
                clearanceRequest.getStudentId(),
                "Verified QR certificate",
                Map.of("hash", certificate.getHash()));

        return new QrVerificationResponse(true, clearanceRequest.getId(), clearanceRequest.getStudentId(), "QR certificate is valid");
    }

    public void closeByRegistrar(UserPrincipal principal, String clearanceRequestId) {
        ClearanceRequest request = getRequest(clearanceRequestId);
        campusAccessService.requireStudentAccess(principal, request.getStudentId());

        if (!principal.getUser().getRole().name().equals("MAIN_REGISTRAR")
                && !principal.getUser().getRole().name().equals("SYSTEM_ADMIN")) {
            throw new AccessDeniedException("Only registrar or system admin can close the file");
        }

        QrCertificate certificate = qrCertificateRepository.findByClearanceRequestId(clearanceRequestId)
                .orElseThrow(() -> new IllegalArgumentException("QR certificate must be generated before final closure"));
        if (certificate.getVerifiedAt() == null) {
            throw new IllegalArgumentException("QR certificate must be verified before final closure");
        }

        request.setStatus(ClearanceRequestStatus.CLOSED);
        request.setClosedAt(Instant.now());
        clearanceRequestRepository.save(request);

        auditLogService.log(
                principal,
                AuditAction.REGISTRAR_CLOSED,
                "CLEARANCE_REQUEST",
                request.getId(),
                request.getStudentId(),
                "Registrar closed clearance request",
                Map.of("qrCertificateId", certificate.getId()));
    }

    private void ensureReadyForQr(List<ClearanceCheck> checks) {
        boolean ready = checks.stream()
                .allMatch(check -> check.getStatus() == ClearanceCheckStatus.CLEARED);
        if (!ready) {
            throw new IllegalArgumentException("All required clearance checks must be cleared before QR generation");
        }
    }

    private String signPayload(ClearanceRequest request) {
        String payload = request.getStudentId() + "|" + request.getCampusId() + "|" + request.getId() + "|" + request.getAcademicYearLabel();
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(qrProperties.getSigningSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] signature = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return payload + "|" + Base64.getEncoder().encodeToString(signature);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign QR payload", ex);
        }
    }

    private String generateBase64Qr(String payload) {
        try {
            BitMatrix bitMatrix = new MultiFormatWriter().encode(payload, BarcodeFormat.QR_CODE, 300, 300);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            return Base64.getEncoder().encodeToString(outputStream.toByteArray());
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to generate QR image", ex);
        }
    }

    private String hash(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash QR payload", ex);
        }
    }

    private ClearanceRequest getRequest(String clearanceRequestId) {
        return clearanceRequestRepository.findById(clearanceRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Clearance request not found"));
    }

    public void sendCertificateToStudent(UserPrincipal principal, String clearanceRequestId, String message) {
        ClearanceRequest request = getRequest(clearanceRequestId);
        if (!principal.getUser().getRole().name().equals("MAIN_REGISTRAR")
                && !principal.getUser().getRole().name().equals("SYSTEM_ADMIN")) {
            throw new AccessDeniedException("Only registrar or system admin can send certificates");
        }

        QrCertificate certificate = qrCertificateRepository.findByClearanceRequestId(clearanceRequestId)
                .orElseThrow(() -> new IllegalArgumentException("QR certificate not found"));

        auditLogService.log(
                principal,
                AuditAction.QR_SENT_TO_STUDENT,
                "QR_CERTIFICATE",
                certificate.getId(),
                request.getStudentId(),
                "Sent certificate to student",
                Map.of("message", message == null ? "" : message));
    }

    public QrCertificateResponse toResponse(QrCertificate certificate) {
        return new QrCertificateResponse(
                certificate.getId(),
                certificate.getClearanceRequestId(),
                certificate.getStudentId(),
                certificate.getCampusId(),
                certificate.getHash(),
                certificate.getSignedPayload(),
                certificate.getBase64Qr(),
                certificate.getGeneratedAt());
    }
}
