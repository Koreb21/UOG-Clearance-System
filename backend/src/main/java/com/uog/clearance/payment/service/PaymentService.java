package com.uog.clearance.payment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.uog.clearance.audit.model.AuditAction;
import com.uog.clearance.audit.service.AuditLogService;
import com.uog.clearance.clearance.model.ClearanceCheck;
import com.uog.clearance.clearance.model.ClearanceCheckStatus;
import com.uog.clearance.clearance.model.ClearanceRequest;
import com.uog.clearance.clearance.model.ClearanceRequestStatus;
import com.uog.clearance.clearance.repository.ClearanceCheckRepository;
import com.uog.clearance.clearance.repository.ClearanceRequestRepository;
import com.uog.clearance.liability.model.Liability;
import com.uog.clearance.liability.model.LiabilityStatus;
import com.uog.clearance.liability.repository.LiabilityRepository;
import com.uog.clearance.payment.config.ChapaProperties;
import com.uog.clearance.payment.dto.ChapaCallbackRequest;
import com.uog.clearance.payment.dto.ChapaInitiationResponse;
import com.uog.clearance.payment.dto.InitiateChapaPaymentRequest;
import com.uog.clearance.payment.dto.ManualPaymentRequest;
import com.uog.clearance.payment.dto.PaymentResponse;
import com.uog.clearance.payment.dto.PaymentVerificationRequest;
import com.uog.clearance.payment.model.PaymentProvider;
import com.uog.clearance.payment.model.PaymentRecord;
import com.uog.clearance.payment.model.PaymentStatus;
import com.uog.clearance.payment.repository.PaymentRecordRepository;
import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.security.service.CampusAccessService;
import com.uog.clearance.student.model.Student;
import com.uog.clearance.student.repository.StudentRepository;
import com.uog.clearance.user.model.UserRole;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import com.uog.clearance.clearance.model.ClearanceCheckCode;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRecordRepository paymentRecordRepository;
    private final ClearanceRequestRepository clearanceRequestRepository;
    private final ClearanceCheckRepository clearanceCheckRepository;
    private final LiabilityRepository liabilityRepository;
    private final CampusAccessService campusAccessService;
    private final AuditLogService auditLogService;
    private final ChapaProperties chapaProperties;
    private final StudentRepository studentRepository;
    private final RestClient restClient = RestClient.builder()
            .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory())
            .build();

    public ChapaInitiationResponse initiateChapaPayment(UserPrincipal principal, InitiateChapaPaymentRequest request) {
        ClearanceRequest clearanceRequest = getRequest(request.clearanceRequestId());
        requireStudentOrCampusAccess(principal, clearanceRequest.getStudentId());
        Student student = getStudent(clearanceRequest.getStudentId());

        List<Liability> liabilities = getLiabilitiesForPayment(clearanceRequest, request.liabilityIds());
        BigDecimal totalAmount = liabilities.stream()
                .map(Liability::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        PaymentRecord payment = new PaymentRecord();
        payment.setClearanceRequestId(clearanceRequest.getId());
        payment.setStudentId(clearanceRequest.getStudentId());
        payment.setCampusId(clearanceRequest.getCampusId());
        payment.setLiabilityIds(request.liabilityIds());
        payment.setProvider(PaymentProvider.CHAPA);
        payment.setDepartmentCheckCode(resolveDepartmentCheckCode(liabilities));
        payment.setTxRef(generateTxRef());
        payment.setAmount(totalAmount);
        payment.setStatus(PaymentStatus.PENDING_VERIFY);
        payment.setCreatedBy(principal.getId());
        payment = paymentRecordRepository.save(payment);

        clearanceRequest.setStatus(ClearanceRequestStatus.PAYMENT_PENDING);
        clearanceRequestRepository.save(clearanceRequest);

        auditLogService.log(
                principal,
                AuditAction.PAYMENT_INITIATED,
                "PAYMENT",
                payment.getId(),
                payment.getStudentId(),
                "Initiated Chapa payment",
                Map.of("txRef", payment.getTxRef(), "amount", payment.getAmount()));

        String checkoutUrl = initializeChapaCheckout(payment, student);
        return new ChapaInitiationResponse(
                toResponse(payment),
                checkoutUrl,
                chapaProperties.getCallbackUrl(),
                chapaProperties.getReturnUrl());
    }

    public PaymentResponse handleChapaCallback(ChapaCallbackRequest request, String callbackToken) {
        validateCallbackToken(callbackToken);
        return applyChapaResult(request.txRef(), request.providerReference(), request.status(), request.message());
    }

    public PaymentResponse handleChapaRedirectCallback(String txRef, String providerReference, String status) {
        return applyChapaResult(txRef, providerReference, status, "Processed from callback redirect");
    }

    public PaymentResponse handleChapaWebhook(String rawBody, String signatureHeader, String alternateSignatureHeader) {
        validateWebhookSignature(rawBody, signatureHeader, alternateSignatureHeader);
        ChapaCallbackRequest request = parseWebhookPayload(rawBody);
        return applyChapaResult(request.txRef(), request.providerReference(), request.status(), request.message());
    }

    public PaymentResponse verifyPayment(UserPrincipal principal, String txRef, PaymentVerificationRequest request) {
        PaymentRecord payment = paymentRecordRepository.findByTxRef(txRef)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));
        campusAccessService.requireStudentAccess(principal, payment.getStudentId());
        ensureFinanceOrAdmin(principal);
        if (payment.getProvider() != PaymentProvider.CHAPA) {
            throw new IllegalArgumentException("Verification endpoint only supports Chapa payments");
        }

        PaymentStatus newStatus = mapExternalStatus(request.status());
        payment.setProviderReference(request.providerReference());
        payment.setStatus(newStatus);
        payment.setVerifiedBy(principal.getId());
        payment.setVerifiedAt(Instant.now());
        payment.setVerificationPayload(Map.of(
                "status", request.status(),
                "message", request.message() == null ? "" : request.message(),
                "verifiedBy", principal.getId()));

        if (newStatus == PaymentStatus.SUCCESS) {
            markPaidLiabilities(payment, principal.getId());
        }

        payment = paymentRecordRepository.save(payment);
        refreshAfterPayment(payment, principal.getId());

        auditLogService.log(
                principal,
                AuditAction.PAYMENT_VERIFIED,
                "PAYMENT",
                payment.getId(),
                payment.getStudentId(),
                "Verified payment",
                Map.of("txRef", payment.getTxRef(), "status", payment.getStatus().name()));

        return toResponse(payment);
    }

    public PaymentResponse recordManualPayment(UserPrincipal principal, ManualPaymentRequest request) {
        campusAccessService.requireStudentAccess(principal, request.studentId());
        ensureFinanceOrAdmin(principal);

        ClearanceRequest clearanceRequest = getRequest(request.clearanceRequestId());
        if (!clearanceRequest.getStudentId().equals(request.studentId())) {
            throw new IllegalArgumentException("Clearance request does not belong to the student");
        }

        List<Liability> liabilities = getLiabilitiesForPayment(clearanceRequest, request.liabilityIds());
        BigDecimal totalAmount = liabilities.stream()
                .map(Liability::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        PaymentRecord payment = new PaymentRecord();
        payment.setClearanceRequestId(clearanceRequest.getId());
        payment.setStudentId(request.studentId());
        payment.setCampusId(clearanceRequest.getCampusId());
        payment.setLiabilityIds(request.liabilityIds());
        payment.setProvider(PaymentProvider.BANK_SLIP);
        payment.setDepartmentCheckCode(resolveDepartmentCheckCode(liabilities));
        payment.setTxRef(generateTxRef());
        payment.setProviderReference(request.providerReference());
        payment.setAmount(totalAmount);
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setCreatedBy(principal.getId());
        payment.setVerifiedBy(principal.getId());
        payment.setVerifiedAt(Instant.now());
        payment.setVerificationPayload(Map.of("note", request.note() == null ? "" : request.note()));
        payment = paymentRecordRepository.save(payment);

        markPaidLiabilities(payment, principal.getId());
        refreshAfterPayment(payment, principal.getId());

        auditLogService.log(
                principal,
                AuditAction.MANUAL_PAYMENT_RECORDED,
                "PAYMENT",
                payment.getId(),
                payment.getStudentId(),
                "Recorded manual payment",
                Map.of("providerReference", payment.getProviderReference(), "amount", payment.getAmount()));

        return toResponse(payment);
    }

    public java.util.Map<String, Object> lookupPaymentByRef(UserPrincipal principal, String ref) {
        ensureFinanceOrAdmin(principal);
        PaymentRecord payment = paymentRecordRepository.findByTxRef(ref)
                .or(() -> paymentRecordRepository.findByReceiptNumber(ref))
                .or(() -> paymentRecordRepository.findByProviderReference(ref))
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for reference: " + ref));

        Student student = studentRepository.findByStudentId(payment.getStudentId()).orElse(null);

        String checkId = null;
        String checkStatus = null;
        if (payment.getClearanceRequestId() != null && payment.getDepartmentCheckCode() != null) {
            ClearanceCheck check = clearanceCheckRepository
                    .findByClearanceRequestIdAndCheckCode(payment.getClearanceRequestId(), payment.getDepartmentCheckCode())
                    .orElse(null);
            if (check != null) {
                checkId = check.getId();
                checkStatus = check.getStatus().name();
            }
        }

        java.util.Map<String, Object> studentInfo = null;
        if (student != null) {
            studentInfo = new java.util.LinkedHashMap<>();
            studentInfo.put("studentId", student.getStudentId());
            studentInfo.put("fullName", String.join(" ",
                    Objects.toString(student.getFirstName(), ""),
                    Objects.toString(student.getLastName(), "")).trim());
            studentInfo.put("program", Objects.toString(student.getProgram(), ""));
            studentInfo.put("academicYear", student.getAcademicYear() != null ? student.getAcademicYear() : "");
            studentInfo.put("email", Objects.toString(student.getEmail(), ""));
            studentInfo.put("campusId", Objects.toString(student.getCampusId(), ""));
        }

        String displayStatus;
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            displayStatus = "VERIFIED";
        } else if (payment.getStatus() == PaymentStatus.PENDING_VERIFY) {
            displayStatus = "PENDING";
        } else {
            displayStatus = payment.getStatus().name();
        }

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", payment.getId());
        result.put("txRef", payment.getTxRef());
        result.put("receiptNumber", payment.getReceiptNumber());
        result.put("providerReference", payment.getProviderReference());
        result.put("provider", payment.getProvider().name());
        result.put("amount", payment.getAmount());
        result.put("currency", payment.getCurrency());
        result.put("status", displayStatus);
        result.put("verifiedAt", payment.getVerifiedAt() != null ? payment.getVerifiedAt().toString() : null);
        result.put("receiptIssuedAt", payment.getReceiptIssuedAt() != null ? payment.getReceiptIssuedAt().toString() : null);
        result.put("departmentCheckCode", payment.getDepartmentCheckCode() != null ? payment.getDepartmentCheckCode().name() : null);
        result.put("clearanceRequestId", payment.getClearanceRequestId());
        result.put("checkId", checkId);
        result.put("checkStatus", checkStatus);
        result.put("student", studentInfo);
        return result;
    }

    public List<PaymentResponse> listPayments(UserPrincipal principal, String clearanceRequestId) {
        ClearanceRequest request = getRequest(clearanceRequestId);
        requireStudentOrCampusAccess(principal, request.getStudentId());
        return paymentRecordRepository.findByClearanceRequestId(clearanceRequestId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<PaymentResponse> listPaymentHistory(UserPrincipal principal, String campusId) {
        ensureFinanceOrAdmin(principal);
        String resolvedCampusId = campusId != null && !campusId.isBlank()
                ? campusId
                : principal.getCampusId();
        return paymentRecordRepository.findByCampusIdAndProviderOrderByVerifiedAtDesc(resolvedCampusId, PaymentProvider.STANDALONE)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public PaymentResponse recordStandalonePayment(UserPrincipal principal,
                                                    com.uog.clearance.payment.dto.StandalonePaymentRequest request) {
        campusAccessService.requireStudentAccess(principal, request.studentId());
        ensureFinanceOrAdmin(principal);

        PaymentRecord payment = new PaymentRecord();
        payment.setClearanceRequestId(request.clearanceRequestId());
        payment.setStudentId(request.studentId());
        payment.setCampusId(request.campusId());
        payment.setLiabilityIds(request.liabilityId() != null ? List.of(request.liabilityId()) : List.of());
        payment.setProvider(PaymentProvider.STANDALONE);
        payment.setDepartmentCheckCode(com.uog.clearance.clearance.model.ClearanceCheckCode.DEPARTMENT_HEAD);
        payment.setTxRef(request.txId());
        payment.setProviderReference(request.referenceNumber());
        payment.setAmount(request.amountPaid());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setCreatedBy(principal.getId());
        payment.setVerifiedBy(principal.getId());
        payment.setVerifiedAt(Instant.now());
        payment.setReceiptNumber(request.receiptNumber());
        payment.setVerificationPayload(Map.of(
                "studentFullName", request.studentFullName(),
                "yearOfStudy", request.yearOfStudy() == null ? "" : request.yearOfStudy(),
                "department", request.department() == null ? "" : request.department(),
                "recordedBy", request.recordedBy(),
                "paymentDate", request.paymentDate()));
        payment = paymentRecordRepository.save(payment);

        issueFinanceReceipt(payment, principal.getId());
        payment = paymentRecordRepository.save(payment);

        if (request.liabilityId() != null && request.clearanceRequestId() != null) {
            markPaidLiabilities(payment, principal.getId());
            refreshAfterPayment(payment, principal.getId());
        }

        auditLogService.log(
                principal,
                com.uog.clearance.audit.model.AuditAction.MANUAL_PAYMENT_RECORDED,
                "PAYMENT",
                payment.getId(),
                payment.getStudentId(),
                "Recorded standalone payment",
                Map.of("txRef", payment.getTxRef(), "amount", payment.getAmount()));

        return toResponse(payment);
    }

    private void markPaidLiabilities(PaymentRecord payment, String actorUserId) {
        List<Liability> liabilities = liabilityRepository.findAllById(payment.getLiabilityIds());
        for (Liability liability : liabilities) {
            liability.setStatus(LiabilityStatus.PAID);
            liability.setUpdatedBy(actorUserId);
            liabilityRepository.save(liability);
        }
        issueFinanceReceipt(payment, actorUserId);
    }

    private void refreshAfterPayment(PaymentRecord payment, String reviewerId) {
        ClearanceRequest clearanceRequest = getRequest(payment.getClearanceRequestId());
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            clearanceRequest.setStatus(ClearanceRequestStatus.IN_REVIEW);
            moveDepartmentCheckToPendingApproval(payment, reviewerId);
        } else if (payment.getStatus() == PaymentStatus.FAILED) {
            clearanceRequest.setStatus(ClearanceRequestStatus.PAYMENT_PENDING);
        }
        clearanceRequestRepository.save(clearanceRequest);
    }

    private void moveDepartmentCheckToPendingApproval(PaymentRecord payment, String reviewerId) {
        if (payment.getDepartmentCheckCode() == null) {
            return;
        }

        ClearanceCheck departmentCheck = clearanceCheckRepository
                .findByClearanceRequestIdAndCheckCode(payment.getClearanceRequestId(), payment.getDepartmentCheckCode())
                .orElseThrow(() -> new IllegalArgumentException("Department check not found"));

        departmentCheck.setStatus(ClearanceCheckStatus.PAID_PENDING_DEPARTMENT_APPROVAL);
        departmentCheck.setComment(buildFinanceReceiptComment(payment));
        departmentCheck.setReviewedBy(reviewerId);
        departmentCheck.setReviewedAt(Instant.now());
        clearanceCheckRepository.save(departmentCheck);
    }

    private List<Liability> getLiabilitiesForPayment(ClearanceRequest clearanceRequest, List<String> liabilityIds) {
        List<Liability> liabilities = liabilityRepository.findAllById(liabilityIds);
        if (liabilities.isEmpty() || liabilities.size() != liabilityIds.size()) {
            throw new IllegalArgumentException("One or more liabilities were not found");
        }
        boolean invalid = liabilities.stream().anyMatch(liability ->
                !liability.getClearanceRequestId().equals(clearanceRequest.getId())
                        || !liability.isPaymentRequired()
                        || liability.getStatus() == LiabilityStatus.PAID
                        || liability.getStatus() == LiabilityStatus.CLEARED);
        if (invalid) {
            throw new IllegalArgumentException("Selected liabilities are not eligible for payment");
        }
        return liabilities;
    }

    private ClearanceCheckCode resolveDepartmentCheckCode(List<Liability> liabilities) {
        HashSet<ClearanceCheckCode> checkCodes = new HashSet<>();
        for (Liability liability : liabilities) {
            checkCodes.add(liability.getDepartmentCheckCode());
        }
        if (checkCodes.size() != 1) {
            throw new IllegalArgumentException("A payment must belong to one department workflow at a time");
        }
        return liabilities.get(0).getDepartmentCheckCode();
    }

    private ClearanceRequest getRequest(String clearanceRequestId) {
        return clearanceRequestRepository.findById(clearanceRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Clearance request not found"));
    }

    private Student getStudent(String studentId) {
        return studentRepository.findByStudentId(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
    }

    private void requireStudentOrCampusAccess(UserPrincipal principal, String studentId) {
        if (principal.getStudentId() != null && principal.getStudentId().equals(studentId)) {
            return;
        }
        campusAccessService.requireStudentAccess(principal, studentId);
    }

    private void ensureFinanceOrAdmin(UserPrincipal principal) {
        UserRole role = principal.getUser().getRole();
        if (role != UserRole.FINANCE_OFFICER && role != UserRole.SYSTEM_ADMIN) {
            throw new AccessDeniedException("Only finance or system admin can verify payments");
        }
    }

    private PaymentStatus mapExternalStatus(String status) {
        if (status == null) {
            return PaymentStatus.PENDING_VERIFY;
        }
        return switch (status.toUpperCase()) {
            case "SUCCESS", "PAID", "COMPLETED" -> PaymentStatus.SUCCESS;
            case "FAILED", "ERROR" -> PaymentStatus.FAILED;
            case "CANCELLED" -> PaymentStatus.CANCELLED;
            default -> PaymentStatus.PENDING_VERIFY;
        };
    }

    private void validateCallbackToken(String callbackToken) {
        String expected = chapaProperties.getCallbackToken();
        if (expected == null || expected.isBlank()) {
            return;
        }
        if (!Objects.equals(expected, callbackToken)) {
            throw new AccessDeniedException("Invalid Chapa callback token");
        }
    }

    private String generateTxRef() {
        return "TX-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    private String initializeChapaCheckout(PaymentRecord payment, Student student) {
        if (!StringUtils.hasText(chapaProperties.getSecretKey())) {
            return chapaProperties.getCheckoutBaseUrl() + "?tx_ref=" + payment.getTxRef();
        }
        if (!StringUtils.hasText(student.getEmail())) {
            throw new IllegalArgumentException("Student email is required before initiating Chapa payment");
        }

        Map<String, Object> payload = Map.of(
                "amount", payment.getAmount().toPlainString(),
                "currency", payment.getCurrency(),
                "email", student.getEmail(),
                "first_name", firstNonBlank(student.getFirstName(), student.getStudentId()),
                "last_name", firstNonBlank(student.getLastName(), student.getMiddleName(), "Student"),
                "phone_number", student.getPhone() == null ? "" : student.getPhone(),
                "tx_ref", payment.getTxRef(),
                "callback_url", chapaProperties.getCallbackUrl(),
                "return_url", chapaProperties.getReturnUrl());

        try {
            JsonNode response = restClient.post()
                    .uri(chapaProperties.getInitializeUrl())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + chapaProperties.getSecretKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);

            String checkoutUrl = response == null ? null : response.path("data").path("checkout_url").asText(null);
            if (!StringUtils.hasText(checkoutUrl)) {
                throw new IllegalArgumentException("Chapa did not return a checkout URL");
            }
            return checkoutUrl;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unable to initialize Chapa payment: " + ex.getMessage(), ex);
        }
    }

    private PaymentResponse applyChapaResult(
            String txRef,
            String providerReference,
            String callbackStatus,
            String message
    ) {
        PaymentRecord payment = paymentRecordRepository.findByTxRef(txRef)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));
        if (payment.getProvider() != PaymentProvider.CHAPA) {
            throw new IllegalArgumentException("Payment is not a Chapa payment");
        }
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return toResponse(payment);
        }

        ChapaVerificationResult verificationResult = verifyWithChapa(txRef, callbackStatus, providerReference, message);
        payment.setProviderReference(verificationResult.providerReference());
        payment.setStatus(verificationResult.status());
        payment.setVerificationPayload(verificationResult.payload());

        if (verificationResult.status() == PaymentStatus.SUCCESS) {
            payment.setVerifiedAt(Instant.now());
            markPaidLiabilities(payment, null);
        }

        payment = paymentRecordRepository.save(payment);
        refreshAfterPayment(payment, null);
        return toResponse(payment);
    }

    private ChapaVerificationResult verifyWithChapa(
            String txRef,
            String callbackStatus,
            String providerReference,
            String message
    ) {
        if (!StringUtils.hasText(chapaProperties.getSecretKey())) {
            return new ChapaVerificationResult(
                    mapExternalStatus(callbackStatus),
                    providerReference,
                    Map.of(
                            "source", "callback-fallback",
                            "status", callbackStatus == null ? "" : callbackStatus,
                            "message", message == null ? "" : message));
        }

        try {
            JsonNode response = restClient.get()
                    .uri(chapaProperties.getVerifyUrl() + "/" + txRef)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + chapaProperties.getSecretKey())
                    .retrieve()
                    .body(JsonNode.class);

            JsonNode data = response == null ? null : response.path("data");
            String verifiedStatus = firstNonBlank(
                    data == null ? null : data.path("status").asText(null),
                    response == null ? null : response.path("status").asText(null),
                    callbackStatus);
            String verifiedReference = firstNonBlank(
                    data == null ? null : data.path("reference").asText(null),
                    data == null ? null : data.path("ref_id").asText(null),
                    providerReference);

            return new ChapaVerificationResult(
                    mapExternalStatus(verifiedStatus),
                    verifiedReference,
                    Map.of(
                            "source", "verify-endpoint",
                            "status", verifiedStatus == null ? "" : verifiedStatus,
                            "callbackStatus", callbackStatus == null ? "" : callbackStatus,
                            "providerReference", verifiedReference == null ? "" : verifiedReference,
                            "message", message == null ? "" : message));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unable to verify Chapa payment: " + ex.getMessage(), ex);
        }
    }

    private void validateWebhookSignature(String rawBody, String signatureHeader, String alternateSignatureHeader) {
        String secret = chapaProperties.getWebhookSecret();
        if (!StringUtils.hasText(secret)) {
            return;
        }
        String providedSignature = firstNonBlank(signatureHeader, alternateSignatureHeader);
        if (!StringUtils.hasText(providedSignature)) {
            throw new AccessDeniedException("Missing Chapa webhook signature");
        }
        String expectedSignature = hmacSha256Hex(rawBody, secret);
        if (!expectedSignature.equalsIgnoreCase(providedSignature)) {
            throw new AccessDeniedException("Invalid Chapa webhook signature");
        }
    }

    private ChapaCallbackRequest parseWebhookPayload(String rawBody) {
        try {
            JsonNode root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(rawBody);
            JsonNode data = root.path("data");
            String txRef = firstNonBlank(
                    data.path("tx_ref").asText(null),
                    root.path("tx_ref").asText(null),
                    data.path("txRef").asText(null),
                    root.path("txRef").asText(null));
            String status = firstNonBlank(
                    data.path("status").asText(null),
                    root.path("status").asText(null));
            String providerReference = firstNonBlank(
                    data.path("reference").asText(null),
                    data.path("ref_id").asText(null),
                    root.path("ref_id").asText(null),
                    root.path("reference").asText(null));
            String msg = firstNonBlank(
                    root.path("message").asText(null),
                    data.path("message").asText(null));
            if (!StringUtils.hasText(txRef) || !StringUtils.hasText(status)) {
                throw new IllegalArgumentException("Webhook payload is missing tx_ref or status");
            }
            return new ChapaCallbackRequest(txRef, status, providerReference, msg);
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to parse Chapa webhook payload", ex);
        }
    }

    private String hmacSha256Hex(String body, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unable to validate webhook signature", ex);
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (StringUtils.hasText(value)) {
                return value;
            }
        }
        return null;
    }

    public PaymentResponse toResponse(PaymentRecord payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getClearanceRequestId(),
                payment.getStudentId(),
                payment.getLiabilityIds(),
                payment.getProvider(),
                payment.getTxRef(),
                payment.getProviderReference(),
                payment.getDepartmentCheckCode(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getStatus(),
                payment.getVerifiedAt(),
                payment.getReceiptNumber(),
                payment.getReceiptSignature(),
                payment.getReceiptIssuedAt());
    }

    private void issueFinanceReceipt(PaymentRecord payment, String actorUserId) {
        Instant issuedAt = Instant.now();
        String receiptNumber = payment.getReceiptNumber() != null
                ? payment.getReceiptNumber()
                : "FRC-" + payment.getTxRef();
        String signaturePayload = String.join("|",
                receiptNumber,
                payment.getTxRef(),
                payment.getStudentId(),
                payment.getAmount().toPlainString(),
                payment.getCurrency(),
                payment.getDepartmentCheckCode() == null ? "UNKNOWN" : payment.getDepartmentCheckCode().name(),
                issuedAt.toString());
        String signature = hmacSha256Hex(signaturePayload, firstNonBlank(chapaProperties.getFinanceReceiptSecret(), "finance-receipt-secret"));

        payment.setReceiptNumber(receiptNumber);
        payment.setReceiptIssuedAt(issuedAt);
        payment.setReceiptSignature(signature);

        auditLogService.log(
                null,
                AuditAction.FINANCE_RECEIPT_ISSUED,
                "PAYMENT",
                payment.getId(),
                payment.getStudentId(),
                "Issued finance receipt",
                Map.of(
                        "receiptNumber", receiptNumber,
                        "txRef", payment.getTxRef(),
                        "departmentCheckCode", payment.getDepartmentCheckCode() == null ? "" : payment.getDepartmentCheckCode().name()));
    }

    private String buildFinanceReceiptComment(PaymentRecord payment) {
        if (payment.getReceiptNumber() == null) {
            return "Finance verified payment. Department must confirm before clearing.";
        }
        return "Finance receipt " + payment.getReceiptNumber() + " verified. Department approval is still required.";
    }

    private record ChapaVerificationResult(
            PaymentStatus status,
            String providerReference,
            Map<String, Object> payload
    ) {
    }
}
