package com.uog.clearance.clearance.controller;

import com.uog.clearance.clearance.dto.ClearanceRequestResponse;
import com.uog.clearance.clearance.dto.CreateClearanceRequestRequest;
import com.uog.clearance.clearance.dto.ClearanceStatusResponse;
import com.uog.clearance.clearance.service.ClearanceRequestService;
import com.uog.clearance.clearance.service.ClearanceWorkflowService;
import com.uog.clearance.security.model.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/api/v1/students/me/clearance-requests")
@RequiredArgsConstructor
public class StudentClearanceController {

    private final ClearanceRequestService clearanceRequestService;
    private final ClearanceWorkflowService clearanceWorkflowService;

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ClearanceRequestResponse create(@AuthenticationPrincipal UserPrincipal principal,
                                           @Valid @RequestBody CreateClearanceRequestRequest request) {
        return clearanceRequestService.createForStudent(principal, request);
    }

    @GetMapping
    @PreAuthorize("hasRole('STUDENT')")
    public List<ClearanceRequestResponse> list(@AuthenticationPrincipal UserPrincipal principal) {
        return clearanceRequestService.listForStudent(principal);
    }

    @GetMapping("/{requestId}/status")
    @PreAuthorize("hasRole('STUDENT')")
    public ClearanceStatusResponse status(@AuthenticationPrincipal UserPrincipal principal,
                                          @PathVariable String requestId) {
        return clearanceWorkflowService.getStatusForStudent(principal, requestId);
    }
}
