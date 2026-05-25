package com.uog.clearance.clearance.service;

import com.uog.clearance.audit.model.AuditAction;
import com.uog.clearance.audit.service.AuditLogService;
import com.uog.clearance.clearance.dto.ClearanceCheckResponse;
import com.uog.clearance.clearance.dto.ClearanceRequestResponse;
import com.uog.clearance.clearance.dto.ClearanceStatisticsResponse;
import com.uog.clearance.clearance.dto.ClearanceStatusResponse;
import com.uog.clearance.clearance.dto.ReviewClearanceCheckRequest;
import com.uog.clearance.clearance.dto.StaffQueueItemResponse;
import com.uog.clearance.clearance.dto.ClearanceQueueItemResponse;
import com.uog.clearance.clearance.dto.StudentClearanceOverviewResponse;
import com.uog.clearance.clearance.model.ClearanceCheck;
import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.clearance.model.ClearanceCheckStatus;
import com.uog.clearance.clearance.model.ClearanceRequest;
import com.uog.clearance.clearance.model.ClearanceRequestStatus;
import com.uog.clearance.clearance.repository.ClearanceCheckRepository;
import com.uog.clearance.clearance.repository.ClearanceRequestRepository;
import com.uog.clearance.liability.dto.ClearLiabilityRequest;
import com.uog.clearance.liability.dto.CreateLiabilityRequest;
import com.uog.clearance.liability.dto.LiabilityResponse;
import com.uog.clearance.liability.model.Liability;
import com.uog.clearance.liability.model.LiabilityStatus;
import com.uog.clearance.liability.repository.LiabilityRepository;
import com.uog.clearance.payment.dto.PaymentResponse;
import com.uog.clearance.payment.repository.PaymentRecordRepository;
import com.uog.clearance.payment.service.PaymentService;
import com.uog.clearance.qr.dto.QrCertificateResponse;
import com.uog.clearance.qr.repository.QrCertificateRepository;
import com.uog.clearance.qr.service.QrCertificateService;
import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.security.service.CampusAccessService;
import com.uog.clearance.student.dto.StudentIdentityResponse;
import com.uog.clearance.student.model.Student;
import com.uog.clearance.student.repository.StudentRepository;
import com.uog.clearance.student.service.StudentIdentityService;
import com.uog.clearance.user.model.UserRole;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ClearanceWorkflowService {

    private final ClearanceRequestRepository clearanceRequestRepository;
    private final ClearanceCheckRepository clearanceCheckRepository;
    private final LiabilityRepository liabilityRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final QrCertificateRepository qrCertificateRepository;
    private final CampusAccessService campusAccessService;
    private final AuditLogService auditLogService;
    private final PaymentService paymentService;
    private final QrCertificateService qrCertificateService;
    private final StudentRepository studentRepository;
    private final StudentIdentityService studentIdentityService;

    public LiabilityResponse createLiability(UserPrincipal principal, CreateLiabilityRequest request) {
        campusAccessService.requireStudentAccess(principal, request.studentId());
        validateRoleForCheck(principal.getUser().getRole(), request.departmentCheckCode());

        String campusId;
        if (request.clearanceRequestId() != null && !request.clearanceRequestId().isBlank()) {
            ClearanceRequest clearanceRequest = getClearanceRequest(request.clearanceRequestId());
            if (!clearanceRequest.getStudentId().equals(request.studentId())) {
                throw new IllegalArgumentException("Clearance request does not belong to the student");
            }
            campusId = clearanceRequest.getCampusId();
        } else {
            campusId = principal.getCampusId();
        }

        Liability liability = new Liability();
        liability.setClearanceRequestId(request.clearanceRequestId());
        liability.setStudentId(request.studentId());
        liability.setCampusId(campusId);
        liability.setDepartmentCheckCode(request.departmentCheckCode());
        liability.setCategory(request.category());
        liability.setItemName(request.itemName());
        liability.setDescription(request.description());
        liability.setAmount(request.amount());
        liability.setPaymentRequired(request.paymentRequired());
        liability.setCreatedBy(principal.getId());
        liability.setUpdatedBy(principal.getId());
        liability = liabilityRepository.save(liability);

        // Update the active check for this student under this office, if one exists
        if (request.clearanceRequestId() != null && !request.clearanceRequestId().isBlank()) {
            if (request.paymentRequired()) {
                updateCheckStatus(
                        request.clearanceRequestId(),
                        request.departmentCheckCode(),
                        ClearanceCheckStatus.AWAITING_FINANCE,
                        principal.getId(),
                        "Payment required. Waiting for finance verification.");
            } else {
                markCheckFlagged(request.clearanceRequestId(), request.departmentCheckCode(), principal.getId(), "Liability recorded");
            }
        }

        auditLogService.log(
                principal,
                AuditAction.LIABILITY_CREATED,
                "LIABILITY",
                liability.getId(),
                liability.getStudentId(),
                "Created liability for student",
                Map.of("checkCode", liability.getDepartmentCheckCode().name(), "amount", liability.getAmount()));

        return toLiabilityResponse(liability);
    }

    public LiabilityResponse clearLiability(UserPrincipal principal, String liabilityId, ClearLiabilityRequest request) {
        Liability liability = liabilityRepository.findById(liabilityId)
                .orElseThrow(() -> new IllegalArgumentException("Liability not found"));
        campusAccessService.requireStudentAccess(principal, liability.getStudentId());
        validateRoleForCheck(principal.getUser().getRole(), liability.getDepartmentCheckCode());

        LiabilityStatus status = request.status();
        liability.setStatus(status);
        liability.setUpdatedBy(principal.getId());
        liability = liabilityRepository.save(liability);
        refreshCheckStatusFromLiabilities(liability.getClearanceRequestId(), liability.getDepartmentCheckCode(), principal.getId());

        auditLogService.log(
                principal,
                AuditAction.LIABILITY_CLEARED,
                "LIABILITY",
                liability.getId(),
                liability.getStudentId(),
                "Updated liability status",
                Map.of("status", status.name(), "note", request.note() == null ? "" : request.note()));

        return toLiabilityResponse(liability);
    }

    public ClearanceCheckResponse reviewCheck(UserPrincipal principal, String checkId, ReviewClearanceCheckRequest request) {
        ClearanceCheck check = clearanceCheckRepository.findById(checkId)
                .orElseThrow(() -> new IllegalArgumentException("Clearance check not found"));
        campusAccessService.requireStudentAccess(principal, check.getStudentId());
        validateRoleForCheck(principal.getUser().getRole(), check.getCheckCode());
        validateReviewTransition(check, request.status());

        check.setStatus(request.status());
        check.setComment(request.comment());
        check.setReviewedBy(principal.getId());
        check.setReviewedAt(Instant.now());
        check = clearanceCheckRepository.save(check);

        auditLogService.log(
                principal,
                AuditAction.CHECK_REVIEWED,
                "CLEARANCE_CHECK",
                check.getId(),
                check.getStudentId(),
                "Reviewed clearance check",
                Map.of("checkCode", check.getCheckCode().name(), "status", check.getStatus().name()));

        return toCheckResponse(check);
    }

    public ClearanceStatusResponse getStatusForStudent(UserPrincipal principal, String clearanceRequestId) {
        ClearanceRequest request = getClearanceRequest(clearanceRequestId);
        if (principal.getStudentId() == null || !principal.getStudentId().equals(request.getStudentId())) {
            throw new IllegalArgumentException("Clearance request not found for this student");
        }
        return buildStatusResponse(request);
    }

    public ClearanceStatusResponse getStatusForStaff(UserPrincipal principal, String studentId, String clearanceRequestId) {
        campusAccessService.requireStudentAccess(principal, studentId);
        ClearanceRequest request = getClearanceRequest(clearanceRequestId);
        if (!request.getStudentId().equals(studentId)) {
            throw new IllegalArgumentException("Clearance request does not belong to the student");
        }
        return buildStatusResponse(request);
    }

    public List<StaffQueueItemResponse> listFlaggedForFinance(UserPrincipal principal, String campusId) {
        String resolvedCampusId = campusId != null && !campusId.isBlank()
                ? campusId
                : principal.getCampusId();

        List<ClearanceCheckStatus> targetStatuses = List.of(
                ClearanceCheckStatus.AWAITING_FINANCE,
                ClearanceCheckStatus.PAID_PENDING_DEPARTMENT_APPROVAL,
                ClearanceCheckStatus.FLAGGED);

        List<ClearanceCheck> checks = principal.getUser().getRole() == UserRole.SYSTEM_ADMIN
                ? clearanceCheckRepository.findAll()
                : clearanceCheckRepository.findByCampusIdAndStatusIn(resolvedCampusId, targetStatuses);

        return checks.stream()
                .filter(check -> targetStatuses.contains(check.getStatus()))
                .map(check -> {
                    ClearanceRequest request = getClearanceRequest(check.getClearanceRequestId());
                    Student student = studentRepository.findByStudentId(check.getStudentId())
                            .orElse(null);
                    String studentName = student == null
                            ? check.getStudentId()
                            : String.join(
                                    " ",
                                    Objects.toString(student.getFirstName(), "").trim(),
                                    Objects.toString(student.getLastName(), "").trim()).trim();

                    return new StaffQueueItemResponse(
                            check.getId(),
                            check.getCheckCode(),
                            check.getStatus(),
                            request.getId(),
                            request.getRequestNumber(),
                            request.getRequestType().name(),
                            request.getStatus().name(),
                            check.getStudentId(),
                            studentName,
                            request.getCampusId(),
                            request.getSubmittedAt() == null ? null : request.getSubmittedAt().toString()
                    );
                })
                .toList();
    }

    public List<StaffQueueItemResponse> listQueueForStaff(UserPrincipal principal) {
        ClearanceCheckCode checkCode = mapRoleToCheckCode(principal.getUser().getRole());
        if (checkCode == null) {
            return List.of();
        }

        String campusId = principal.getCampusId();
        List<ClearanceCheck> checks = principal.getUser().getRole() == UserRole.SYSTEM_ADMIN
                ? clearanceCheckRepository.findAll()
                : clearanceCheckRepository.findByCampusIdAndCheckCodeAndStatusNot(
                        campusId,
                        checkCode,
                        ClearanceCheckStatus.CLEARED);

        return checks.stream()
                .filter(check -> principal.getUser().getRole() == UserRole.SYSTEM_ADMIN
                        ? check.getCheckCode() == checkCode && check.getStatus() != ClearanceCheckStatus.CLEARED
                        : true)
                .map(check -> {
                    ClearanceRequest request = getClearanceRequest(check.getClearanceRequestId());
                    Student student = studentRepository.findByStudentId(check.getStudentId())
                            .orElse(null);
                    String studentName = student == null
                            ? check.getStudentId()
                            : String.join(
                                    " ",
                                    Objects.toString(student.getFirstName(), "").trim(),
                                    Objects.toString(student.getLastName(), "").trim()).trim();

                    return new StaffQueueItemResponse(
                            check.getId(),
                            check.getCheckCode(),
                            check.getStatus(),
                            request.getId(),
                            request.getRequestNumber(),
                            request.getRequestType().name(),
                            request.getStatus().name(),
                            check.getStudentId(),
                            studentName,
                            request.getCampusId(),
                            request.getSubmittedAt() == null ? null : request.getSubmittedAt().toString()
                    );
                })
                .toList();
    }

    private ClearanceStatusResponse buildStatusResponse(ClearanceRequest request) {
        Student student = studentRepository.findByStudentId(request.getStudentId())
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        StudentIdentityResponse studentIdentity = studentIdentityService.toIdentityResponse(student);
        List<ClearanceCheckResponse> checks = clearanceCheckRepository.findByClearanceRequestId(request.getId())
                .stream()
                .map(this::toCheckResponse)
                .toList();
        List<LiabilityResponse> liabilities = liabilityRepository.findByClearanceRequestId(request.getId())
                .stream()
                .map(this::toLiabilityResponse)
                .toList();
        List<PaymentResponse> payments = paymentRecordRepository.findByClearanceRequestId(request.getId())
                .stream()
                .map(paymentService::toResponse)
                .toList();
        QrCertificateResponse certificate = qrCertificateRepository.findByClearanceRequestId(request.getId())
                .map(qrCertificateService::toResponse)
                .orElse(null);

        return new ClearanceStatusResponse(
                toRequestResponse(request),
                studentIdentity,
                checks,
                liabilities,
                payments,
                certificate);
    }

    private void validateRoleForCheck(UserRole role, ClearanceCheckCode checkCode) {
        if (role == UserRole.SYSTEM_ADMIN) {
            return;
        }

        boolean allowed = switch (role) {
            case LIBRARIAN -> checkCode == ClearanceCheckCode.LIBRARY;
            case PROCTOR -> checkCode == ClearanceCheckCode.PROCTOR;
            case CAFE_STAFF -> checkCode == ClearanceCheckCode.CAFE;
            case DEPARTMENT_HEAD -> checkCode == ClearanceCheckCode.DEPARTMENT_HEAD;
            case STUDENT_DEAN -> checkCode == ClearanceCheckCode.STUDENT_DEAN;
            default -> false;
        };

        if (!allowed) {
            throw new AccessDeniedException("Your role cannot manage this clearance check");
        }
    }

    private void markCheckFlagged(String clearanceRequestId, ClearanceCheckCode checkCode, String reviewerId, String comment) {
        updateCheckStatus(clearanceRequestId, checkCode, ClearanceCheckStatus.FLAGGED, reviewerId, comment);
    }

    private void refreshCheckStatusFromLiabilities(String clearanceRequestId, ClearanceCheckCode checkCode, String reviewerId) {
        ClearanceRequest request = getClearanceRequest(clearanceRequestId);
        String studentId = request.getStudentId();
        List<Liability> liabilities = liabilityRepository.findByStudentIdAndDepartmentCheckCode(studentId, checkCode);
        boolean hasOutstandingPayment = liabilities.stream()
                .anyMatch(liability -> liability.isPaymentRequired()
                        && liability.getStatus() != LiabilityStatus.PAID
                        && liability.getStatus() != LiabilityStatus.CLEARED
                        && liability.getStatus() != LiabilityStatus.WAIVED);
        boolean hasOutstandingNonPayment = liabilities.stream()
                .anyMatch(liability -> !liability.isPaymentRequired()
                        && liability.getStatus() != LiabilityStatus.CLEARED
                        && liability.getStatus() != LiabilityStatus.WAIVED);

        if (hasOutstandingPayment) {
            updateCheckStatus(
                    clearanceRequestId,
                    checkCode,
                    ClearanceCheckStatus.AWAITING_FINANCE,
                    reviewerId,
                    "Outstanding payment must be completed and verified by finance.");
            return;
        }

        if (!hasOutstandingNonPayment) {
            updateCheckStatus(
                    clearanceRequestId,
                    checkCode,
                    ClearanceCheckStatus.IN_REVIEW,
                    reviewerId,
                    "All recorded issues are resolved. Final departmental approval is required.");
        }
    }

    private void validateReviewTransition(ClearanceCheck check, ClearanceCheckStatus requestedStatus) {
        if (requestedStatus != ClearanceCheckStatus.CLEARED) {
            return;
        }

        List<Liability> liabilities = liabilityRepository.findByStudentIdAndDepartmentCheckCode(
                check.getStudentId(),
                check.getCheckCode());

        boolean hasOutstandingPayment = liabilities.stream()
                .anyMatch(liability -> liability.isPaymentRequired()
                        && liability.getStatus() != LiabilityStatus.PAID
                        && liability.getStatus() != LiabilityStatus.CLEARED
                        && liability.getStatus() != LiabilityStatus.WAIVED);
        if (hasOutstandingPayment) {
            throw new IllegalArgumentException("Finance must verify payment before this department can clear the student");
        }

        boolean hasOutstandingNonPayment = liabilities.stream()
                .anyMatch(liability -> !liability.isPaymentRequired()
                        && liability.getStatus() != LiabilityStatus.CLEARED
                        && liability.getStatus() != LiabilityStatus.WAIVED);
        if (hasOutstandingNonPayment) {
            throw new IllegalArgumentException("Outstanding department issues must be resolved before clearance");
        }

        boolean requiresFinanceConfirmation = liabilities.stream().anyMatch(Liability::isPaymentRequired);
        if (requiresFinanceConfirmation && check.getStatus() != ClearanceCheckStatus.PAID_PENDING_DEPARTMENT_APPROVAL) {
            throw new IllegalArgumentException("This check can only be cleared after finance sends back a verified receipt");
        }
    }

    private ClearanceCheckCode mapRoleToCheckCode(UserRole role) {
        return switch (role) {
            case LIBRARIAN -> ClearanceCheckCode.LIBRARY;
            case PROCTOR -> ClearanceCheckCode.PROCTOR;
            case CAFE_STAFF -> ClearanceCheckCode.CAFE;
            case DEPARTMENT_HEAD -> ClearanceCheckCode.DEPARTMENT_HEAD;
            case STUDENT_DEAN -> ClearanceCheckCode.STUDENT_DEAN;
            case SYSTEM_ADMIN -> null;
            default -> null;
        };
    }

    private void updateCheckStatus(
            String clearanceRequestId,
            ClearanceCheckCode checkCode,
            ClearanceCheckStatus status,
            String reviewerId,
            String comment
    ) {
        ClearanceCheck check = clearanceCheckRepository.findByClearanceRequestIdAndCheckCode(clearanceRequestId, checkCode)
                .orElseThrow(() -> new IllegalArgumentException("Clearance check not found"));
        check.setStatus(status);
        check.setReviewedBy(reviewerId);
        check.setReviewedAt(Instant.now());
        check.setComment(comment);
        clearanceCheckRepository.save(check);
    }

    private ClearanceRequest getClearanceRequest(String clearanceRequestId) {
        return clearanceRequestRepository.findById(clearanceRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Clearance request not found"));
    }

    private LiabilityResponse toLiabilityResponse(Liability liability) {
        return new LiabilityResponse(
                liability.getId(),
                liability.getClearanceRequestId(),
                liability.getStudentId(),
                liability.getCampusId(),
                liability.getDepartmentCheckCode(),
                liability.getCategory(),
                liability.getItemName(),
                liability.getDescription(),
                liability.getAmount(),
                liability.getCurrency(),
                liability.getStatus(),
                liability.isPaymentRequired());
    }

    private ClearanceCheckResponse toCheckResponse(ClearanceCheck check) {
        return new ClearanceCheckResponse(
                check.getId(),
                check.getClearanceRequestId(),
                check.getCheckCode(),
                check.getStatus(),
                check.getReviewedBy(),
                check.getReviewedAt(),
                check.getComment());
    }

    private ClearanceRequestResponse toRequestResponse(ClearanceRequest clearanceRequest) {
        return new ClearanceRequestResponse(
                clearanceRequest.getId(),
                clearanceRequest.getRequestNumber(),
                clearanceRequest.getStudentId(),
                clearanceRequest.getCampusId(),
                clearanceRequest.getSemester(),
                clearanceRequest.getAcademicYearLabel(),
                clearanceRequest.getRequestType(),
                clearanceRequest.getStatus(),
                clearanceRequest.getSubmittedAt());
    }

    public ClearanceStatisticsResponse getStatistics(String campusId) {
        List<ClearanceRequest> allRequests = campusId == null 
            ? clearanceRequestRepository.findAll()
            : clearanceRequestRepository.findByCampusId(campusId);
        
        long totalRequests = allRequests.size();
        long clearedRequests = allRequests.stream()
            .filter(r -> r.getStatus() == ClearanceRequestStatus.CLEARED)
            .count();
        
        double clearancePercentage = totalRequests == 0 ? 0 : (clearedRequests * 100.0) / totalRequests;
        
        // Find most common bottleneck
        Map<ClearanceCheckCode, Long> bottleneckCounts = new java.util.HashMap<>();
        List<ClearanceCheck> allChecks = campusId == null
            ? clearanceCheckRepository.findAll()
            : clearanceCheckRepository.findByCampusId(campusId);
        
        allChecks.stream()
            .filter(c -> c.getStatus() != ClearanceCheckStatus.CLEARED && c.getStatus() != ClearanceCheckStatus.IN_REVIEW)
            .forEach(c -> bottleneckCounts.merge(c.getCheckCode(), 1L, Long::sum));
        
        ClearanceCheckCode mostCommonBottleneck = bottleneckCounts.entrySet().stream()
            .max(java.util.Map.Entry.comparingByValue())
            .map(java.util.Map.Entry::getKey)
            .orElse(ClearanceCheckCode.LIBRARY);
        
        int bottleneckCount = bottleneckCounts.getOrDefault(mostCommonBottleneck, 0L).intValue();
        
        int pendingCount = (int) allChecks.stream()
            .filter(c -> c.getStatus() == ClearanceCheckStatus.PENDING)
            .count();
        
        int inReviewCount = (int) allChecks.stream()
            .filter(c -> c.getStatus() == ClearanceCheckStatus.IN_REVIEW)
            .count();
        
        int flaggedCount = (int) allChecks.stream()
            .filter(c -> c.getStatus() == ClearanceCheckStatus.FLAGGED)
            .count();
        
        return new ClearanceStatisticsResponse(
            totalRequests,
            clearedRequests,
            clearancePercentage,
            mostCommonBottleneck,
            bottleneckCount,
            pendingCount,
            inReviewCount,
            flaggedCount
        );
    }

    public List<ClearanceQueueItemResponse> listClearanceQueue(UserPrincipal principal) {
        ClearanceCheckCode checkCode = mapRoleToCheckCode(principal.getUser().getRole());
        if (checkCode == null) {
            return List.of();
        }

        String campusId = principal.getCampusId();
        List<ClearanceCheck> checks = principal.getUser().getRole() == UserRole.SYSTEM_ADMIN
                ? clearanceCheckRepository.findAll()
                : clearanceCheckRepository.findByCampusIdAndCheckCode(campusId, checkCode);

        return checks.stream()
                .filter(check -> principal.getUser().getRole() == UserRole.SYSTEM_ADMIN
                        ? check.getCheckCode() == checkCode
                        : true)
                .map(check -> {
                    ClearanceRequest request = getClearanceRequest(check.getClearanceRequestId());
                    Student student = studentRepository.findByStudentId(check.getStudentId())
                            .orElse(null);
                    String studentName = student == null
                            ? check.getStudentId()
                            : String.join(
                                    " ",
                                    Objects.toString(student.getFirstName(), "").trim(),
                                    Objects.toString(student.getLastName(), "").trim()).trim();

                    // Look up ALL historical liabilities for this student under this office
                    List<Liability> liabilities = liabilityRepository.findByStudentIdAndDepartmentCheckCode(
                            check.getStudentId(), check.getCheckCode());

                    BigDecimal totalFines = liabilities.stream()
                            .map(Liability::getAmount)
                            .filter(Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    long unpaidCount = liabilities.stream()
                            .filter(l -> !List.of(LiabilityStatus.PAID, LiabilityStatus.CLEARED, LiabilityStatus.WAIVED).contains(l.getStatus()))
                            .count();

                    return new ClearanceQueueItemResponse(
                            check.getId(),
                            check.getCheckCode(),
                            check.getStatus(),
                            request.getId(),
                            request.getRequestNumber(),
                            request.getStatus().name(),
                            request.getSubmittedAt() == null ? null : request.getSubmittedAt().toString(),
                            check.getStudentId(),
                            studentName,
                            student == null ? null : student.getProgram(),
                            request.getCampusId(),
                            totalFines,
                            unpaidCount,
                            liabilities.size()
                    );
                })
                .toList();
    }

    public ClearanceCheckResponse quickApproveCheck(UserPrincipal principal, String checkId) {
        ClearanceCheck check = clearanceCheckRepository.findById(checkId)
                .orElseThrow(() -> new IllegalArgumentException("Clearance check not found"));
        campusAccessService.requireStudentAccess(principal, check.getStudentId());
        validateRoleForCheck(principal.getUser().getRole(), check.getCheckCode());

        // Look up ALL historical liabilities for this student under this office
        List<Liability> liabilities = liabilityRepository.findByStudentIdAndDepartmentCheckCode(
                check.getStudentId(), check.getCheckCode());

        boolean hasOutstandingPayment = liabilities.stream()
                .anyMatch(liability -> liability.isPaymentRequired()
                        && liability.getStatus() != LiabilityStatus.PAID
                        && liability.getStatus() != LiabilityStatus.CLEARED
                        && liability.getStatus() != LiabilityStatus.WAIVED);
        if (hasOutstandingPayment) {
            throw new IllegalArgumentException("Finance must verify payment before this department can clear the student");
        }

        boolean hasOutstandingNonPayment = liabilities.stream()
                .anyMatch(liability -> !liability.isPaymentRequired()
                        && liability.getStatus() != LiabilityStatus.CLEARED
                        && liability.getStatus() != LiabilityStatus.WAIVED);
        if (hasOutstandingNonPayment) {
            throw new IllegalArgumentException("Outstanding department issues must be resolved before clearance");
        }

        boolean requiresFinanceConfirmation = liabilities.stream().anyMatch(Liability::isPaymentRequired);
        if (requiresFinanceConfirmation && check.getStatus() != ClearanceCheckStatus.PAID_PENDING_DEPARTMENT_APPROVAL) {
            throw new IllegalArgumentException("This check can only be cleared after finance sends back a verified receipt");
        }

        check.setStatus(ClearanceCheckStatus.CLEARED);
        check.setReviewedBy(principal.getId());
        check.setReviewedAt(Instant.now());
        check.setComment("Quick approved from staff dashboard");
        check = clearanceCheckRepository.save(check);

        auditLogService.log(
                principal,
                AuditAction.CHECK_REVIEWED,
                "CLEARANCE_CHECK",
                check.getId(),
                check.getStudentId(),
                "Quick approved clearance check",
                Map.of("checkCode", check.getCheckCode().name(), "status", check.getStatus().name()));

        return toCheckResponse(check);
    }

    public List<StudentClearanceOverviewResponse> listStudentOverviews(String campusId) {
        List<ClearanceRequest> requests = campusId == null 
            ? clearanceRequestRepository.findAll()
            : clearanceRequestRepository.findByCampusId(campusId);
        
        return requests.stream()
            .map(request -> {
                Student student = studentRepository.findByStudentId(request.getStudentId())
                    .orElse(null);
                
                if (student == null) {
                    return null;
                }
                
                StudentIdentityResponse studentIdentity = studentIdentityService.toIdentityResponse(student);
                List<ClearanceCheck> checks = clearanceCheckRepository.findByClearanceRequestId(request.getId());
                
                long clearedChecks = checks.stream()
                    .filter(c -> c.getStatus() == ClearanceCheckStatus.CLEARED)
                    .count();
                
                int progressPercentage = checks.isEmpty() ? 0 : (int) ((clearedChecks * 100) / checks.size());
                
                List<ClearanceCheckResponse> checkResponses = checks.stream()
                    .map(this::toCheckResponse)
                    .toList();
                
                boolean hasCertificate = qrCertificateRepository.findByClearanceRequestId(request.getId())
                    .isPresent();
                
                return new StudentClearanceOverviewResponse(
                    request.getId(),
                    request.getRequestNumber(),
                    studentIdentity,
                    request.getStatus(),
                    request.getSubmittedAt(),
                    progressPercentage,
                    checkResponses,
                    hasCertificate
                );
            })
            .filter(Objects::nonNull)
            .toList();
    }
}
