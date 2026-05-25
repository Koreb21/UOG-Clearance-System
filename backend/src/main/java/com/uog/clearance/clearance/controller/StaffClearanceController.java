package com.uog.clearance.clearance.controller;

import com.uog.clearance.clearance.dto.ClearanceStatusResponse;
import com.uog.clearance.clearance.dto.ReviewClearanceCheckRequest;
import com.uog.clearance.clearance.dto.ClearanceCheckResponse;
import com.uog.clearance.clearance.dto.ClearanceRequestResponse;
import com.uog.clearance.clearance.dto.StaffQueueItemResponse;
import com.uog.clearance.clearance.service.ClearanceRequestService;
import com.uog.clearance.clearance.service.ClearanceWorkflowService;
import com.uog.clearance.security.model.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staff")
@RequiredArgsConstructor
public class StaffClearanceController {

    private final ClearanceWorkflowService clearanceWorkflowService;
    private final ClearanceRequestService clearanceRequestService;

    @GetMapping("/clearance-requests")
    @PreAuthorize("hasAnyRole('LIBRARIAN','PROCTOR','CAFE_STAFF','DEPARTMENT_HEAD','STUDENT_DEAN','FINANCE_OFFICER','MAIN_REGISTRAR','SYSTEM_ADMIN') and @campusAccessService.canAccessStudent(principal, #studentId)")
    public java.util.List<ClearanceRequestResponse> listStudentClearanceRequests(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String studentId) {
        return clearanceRequestService.listForVisibleStudent(principal, studentId);
    }

    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('LIBRARIAN','PROCTOR','CAFE_STAFF','DEPARTMENT_HEAD','STUDENT_DEAN','FINANCE_OFFICER','MAIN_REGISTRAR')")
    public java.util.List<StaffQueueItemResponse> listQueue(@AuthenticationPrincipal UserPrincipal principal) {
        return clearanceWorkflowService.listQueueForStaff(principal);
    }

    @GetMapping("/clearance")
    @PreAuthorize("hasAnyRole('LIBRARIAN','PROCTOR','CAFE_STAFF','DEPARTMENT_HEAD','STUDENT_DEAN','FINANCE_OFFICER','MAIN_REGISTRAR','SYSTEM_ADMIN') and @campusAccessService.canAccessStudent(principal, #studentId)")
    public ClearanceStatusResponse getStudentClearance(@AuthenticationPrincipal UserPrincipal principal,
                                                       @RequestParam String studentId,
                                                       @RequestParam String clearanceRequestId) {
        return clearanceWorkflowService.getStatusForStaff(principal, studentId, clearanceRequestId);
    }

    @PatchMapping("/checks/{checkId}/review")
    @PreAuthorize("hasAnyRole('LIBRARIAN','PROCTOR','CAFE_STAFF','DEPARTMENT_HEAD','STUDENT_DEAN','FINANCE_OFFICER','MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public ClearanceCheckResponse reviewCheck(@AuthenticationPrincipal UserPrincipal principal,
                                              @PathVariable String checkId,
                                              @Valid @RequestBody ReviewClearanceCheckRequest request) {
        return clearanceWorkflowService.reviewCheck(principal, checkId, request);
    }

    @GetMapping("/clearance-queue")
    @PreAuthorize("hasAnyRole('LIBRARIAN','PROCTOR','CAFE_STAFF','DEPARTMENT_HEAD','STUDENT_DEAN','MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public java.util.List<com.uog.clearance.clearance.dto.ClearanceQueueItemResponse> listClearanceQueue(
            @AuthenticationPrincipal UserPrincipal principal) {
        return clearanceWorkflowService.listClearanceQueue(principal);
    }

    @PatchMapping("/checks/{checkId}/quick-approve")
    @PreAuthorize("hasAnyRole('LIBRARIAN','PROCTOR','CAFE_STAFF','DEPARTMENT_HEAD','STUDENT_DEAN','MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public ClearanceCheckResponse quickApproveCheck(@AuthenticationPrincipal UserPrincipal principal,
                                                    @PathVariable String checkId) {
        return clearanceWorkflowService.quickApproveCheck(principal, checkId);
    }
}
