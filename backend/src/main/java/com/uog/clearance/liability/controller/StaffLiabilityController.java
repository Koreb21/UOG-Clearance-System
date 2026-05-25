package com.uog.clearance.liability.controller;

import com.uog.clearance.clearance.service.ClearanceWorkflowService;
import com.uog.clearance.liability.dto.ClearLiabilityRequest;
import com.uog.clearance.liability.dto.CreateLiabilityRequest;
import com.uog.clearance.liability.dto.LiabilityResponse;
import com.uog.clearance.security.model.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staff/liabilities")
@RequiredArgsConstructor
public class StaffLiabilityController {

    private final ClearanceWorkflowService clearanceWorkflowService;

    @PostMapping
    @PreAuthorize("hasAnyRole('LIBRARIAN','PROCTOR','CAFE_STAFF','DEPARTMENT_HEAD','STUDENT_DEAN','FINANCE_OFFICER','SYSTEM_ADMIN')")
    public LiabilityResponse createLiability(@AuthenticationPrincipal UserPrincipal principal,
                                             @Valid @RequestBody CreateLiabilityRequest request) {
        return clearanceWorkflowService.createLiability(principal, request);
    }

    @PatchMapping("/{liabilityId}/clear")
    @PreAuthorize("hasAnyRole('LIBRARIAN','PROCTOR','CAFE_STAFF','DEPARTMENT_HEAD','STUDENT_DEAN','FINANCE_OFFICER','SYSTEM_ADMIN')")
    public LiabilityResponse clearLiability(@AuthenticationPrincipal UserPrincipal principal,
                                            @PathVariable String liabilityId,
                                            @Valid @RequestBody ClearLiabilityRequest request) {
        return clearanceWorkflowService.clearLiability(principal, liabilityId, request);
    }
}
