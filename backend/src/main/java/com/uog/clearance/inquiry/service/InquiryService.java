package com.uog.clearance.inquiry.service;

import com.uog.clearance.clearance.model.ClearanceCheckCode;
import com.uog.clearance.clearance.model.ClearanceRequest;
import com.uog.clearance.clearance.repository.ClearanceRequestRepository;
import com.uog.clearance.inquiry.dto.CreateInquiryRequest;
import com.uog.clearance.inquiry.dto.InquiryResponse;
import com.uog.clearance.inquiry.dto.RespondInquiryRequest;
import com.uog.clearance.inquiry.model.InquiryStatus;
import com.uog.clearance.inquiry.model.StatusInquiry;
import com.uog.clearance.inquiry.repository.StatusInquiryRepository;
import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.security.service.CampusAccessService;
import com.uog.clearance.user.model.UserRole;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InquiryService {

    private final StatusInquiryRepository statusInquiryRepository;
    private final ClearanceRequestRepository clearanceRequestRepository;
    private final CampusAccessService campusAccessService;

    public InquiryResponse createInquiry(UserPrincipal principal, CreateInquiryRequest request) {
        ClearanceRequest clearanceRequest = clearanceRequestRepository.findById(request.clearanceRequestId())
                .orElseThrow(() -> new IllegalArgumentException("Clearance request not found"));
        if (!clearanceRequest.getStudentId().equals(principal.getStudentId())) {
            throw new IllegalArgumentException("Clearance request not found for this student");
        }

        StatusInquiry inquiry = new StatusInquiry();
        inquiry.setClearanceRequestId(request.clearanceRequestId());
        inquiry.setStudentId(principal.getStudentId());
        inquiry.setCampusId(principal.getCampusId());
        inquiry.setTargetCheckCode(request.targetCheckCode());
        inquiry.setMessage(request.message());
        inquiry = statusInquiryRepository.save(inquiry);
        return toResponse(inquiry);
    }

    public List<InquiryResponse> listStudentInquiries(UserPrincipal principal) {
        return statusInquiryRepository.findByStudentId(principal.getStudentId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<InquiryResponse> listStaffInquiries(UserPrincipal principal) {
        ClearanceCheckCode target = roleToCheckCode(principal.getUser().getRole());
        return statusInquiryRepository.findByCampusIdAndTargetCheckCode(principal.getCampusId(), target)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public InquiryResponse respond(UserPrincipal principal, String inquiryId, RespondInquiryRequest request) {
        StatusInquiry inquiry = statusInquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("Inquiry not found"));
        campusAccessService.requireStudentAccess(principal, inquiry.getStudentId());

        ClearanceCheckCode allowedCheck = roleToCheckCode(principal.getUser().getRole());
        if (allowedCheck != inquiry.getTargetCheckCode()) {
            throw new AccessDeniedException("Your role cannot answer this inquiry");
        }

        inquiry.setResponse(request.response());
        inquiry.setStatus(request.status());
        inquiry.setRespondedAt(Instant.now());
        inquiry = statusInquiryRepository.save(inquiry);
        return toResponse(inquiry);
    }

    private ClearanceCheckCode roleToCheckCode(UserRole role) {
        return switch (role) {
            case LIBRARIAN -> ClearanceCheckCode.LIBRARY;
            case PROCTOR -> ClearanceCheckCode.PROCTOR;
            case CAFE_STAFF -> ClearanceCheckCode.CAFE;
            case DEPARTMENT_HEAD -> ClearanceCheckCode.DEPARTMENT_HEAD;
            case STUDENT_DEAN -> ClearanceCheckCode.STUDENT_DEAN;
            case FINANCE_OFFICER -> ClearanceCheckCode.FINANCE;
            case MAIN_REGISTRAR -> ClearanceCheckCode.REGISTRAR;
            case SYSTEM_ADMIN -> ClearanceCheckCode.REGISTRAR;
            default -> throw new AccessDeniedException("This role cannot manage inquiries");
        };
    }

    private InquiryResponse toResponse(StatusInquiry inquiry) {
        return new InquiryResponse(
                inquiry.getId(),
                inquiry.getClearanceRequestId(),
                inquiry.getStudentId(),
                inquiry.getCampusId(),
                inquiry.getTargetCheckCode(),
                inquiry.getMessage(),
                inquiry.getResponse(),
                inquiry.getStatus(),
                inquiry.getRespondedAt());
    }
}
