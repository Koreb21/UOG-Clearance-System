package com.uog.clearance.clearance.service;

import com.uog.clearance.audit.model.AuditAction;
import com.uog.clearance.audit.service.AuditLogService;
import com.uog.clearance.clearance.dto.ClearanceRequestResponse;
import com.uog.clearance.clearance.dto.CreateClearanceRequestRequest;
import com.uog.clearance.clearance.model.ClearanceCheck;
import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.clearance.model.ClearanceRequest;
import com.uog.clearance.clearance.model.ClearanceRequestStatus;
import com.uog.clearance.clearance.repository.ClearanceCheckRepository;
import com.uog.clearance.clearance.repository.ClearanceRequestRepository;
import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.security.service.CampusAccessService;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ClearanceRequestService {

    private final ClearanceRequestRepository clearanceRequestRepository;
    private final ClearanceCheckRepository clearanceCheckRepository;
    private final AuditLogService auditLogService;
    private final CampusAccessService campusAccessService;

    public ClearanceRequestResponse createForStudent(UserPrincipal principal, CreateClearanceRequestRequest request) {
        ClearanceRequest clearanceRequest = new ClearanceRequest();
        clearanceRequest.setRequestNumber("CLR-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        clearanceRequest.setStudentId(principal.getStudentId());
        clearanceRequest.setCampusId(principal.getCampusId());
        clearanceRequest.setSemester(request.semester());
        clearanceRequest.setAcademicYearLabel(request.academicYearLabel());
        clearanceRequest.setRequestType(request.requestType());
        clearanceRequest.setStatus(ClearanceRequestStatus.SUBMITTED);
        clearanceRequest.setSubmittedAt(Instant.now());
        clearanceRequest = clearanceRequestRepository.save(clearanceRequest);

        String clearanceRequestId = clearanceRequest.getId();
        String studentId = principal.getStudentId();
        String campusId = principal.getCampusId();

        Arrays.stream(ClearanceCheckCode.values())
                .forEach(code -> clearanceCheckRepository.save(newCheck(clearanceRequestId, studentId, campusId, code)));

        auditLogService.log(
                principal,
                AuditAction.CLEARANCE_REQUEST_CREATED,
                "CLEARANCE_REQUEST",
                clearanceRequest.getId(),
                principal.getStudentId(),
                "Created clearance request",
                Map.of("requestNumber", clearanceRequest.getRequestNumber(), "requestType", clearanceRequest.getRequestType().name()));

        return toResponse(clearanceRequest);
    }

    public List<ClearanceRequestResponse> listForStudent(UserPrincipal principal) {
        return clearanceRequestRepository.findByStudentId(principal.getStudentId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ClearanceRequestResponse> listForVisibleStudent(UserPrincipal principal, String studentId) {
        campusAccessService.requireStudentAccess(principal, studentId);
        return clearanceRequestRepository.findByStudentId(studentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private ClearanceCheck newCheck(String clearanceRequestId, String studentId, String campusId, ClearanceCheckCode code) {
        ClearanceCheck check = new ClearanceCheck();
        check.setClearanceRequestId(clearanceRequestId);
        check.setStudentId(studentId);
        check.setCampusId(campusId);
        check.setCheckCode(code);
        return check;
    }

    private ClearanceRequestResponse toResponse(ClearanceRequest clearanceRequest) {
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
}
