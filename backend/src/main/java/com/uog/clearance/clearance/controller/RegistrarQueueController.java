package com.uog.clearance.clearance.controller;

import com.uog.clearance.clearance.dto.ClearanceRequestResponse;
import com.uog.clearance.clearance.dto.ClearanceStatisticsResponse;
import com.uog.clearance.clearance.dto.StudentClearanceOverviewResponse;
import com.uog.clearance.clearance.model.ClearanceRequestStatus;
import com.uog.clearance.clearance.repository.ClearanceRequestRepository;
import com.uog.clearance.clearance.service.ClearanceWorkflowService;
import com.uog.clearance.security.model.UserPrincipal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/registrar/clearance-requests")
@RequiredArgsConstructor
public class RegistrarQueueController {

    private final ClearanceRequestRepository clearanceRequestRepository;
    private final ClearanceWorkflowService clearanceWorkflowService;

    @GetMapping
    @PreAuthorize("hasAnyRole('MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public List<ClearanceRequestResponse> listReadyRequests(@AuthenticationPrincipal UserPrincipal principal) {
        return clearanceRequestRepository.findAll()
                .stream()
                .filter(request -> request.getStatus() == ClearanceRequestStatus.IN_REVIEW
                        || request.getStatus() == ClearanceRequestStatus.CLEARED)
                .filter(request -> principal.getCampusId() == null || principal.getCampusId().equals(request.getCampusId()))
                .map(request -> new ClearanceRequestResponse(
                        request.getId(),
                        request.getRequestNumber(),
                        request.getStudentId(),
                        request.getCampusId(),
                        request.getSemester(),
                        request.getAcademicYearLabel(),
                        request.getRequestType(),
                        request.getStatus(),
                        request.getSubmittedAt()))
                .toList();
    }

    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public ClearanceStatisticsResponse getStatistics(@AuthenticationPrincipal UserPrincipal principal) {
        String campusId = principal.getCampusId();
        return clearanceWorkflowService.getStatistics(campusId);
    }

    @GetMapping("/all-students")
    @PreAuthorize("hasAnyRole('MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public List<StudentClearanceOverviewResponse> listAllStudentClearances(@AuthenticationPrincipal UserPrincipal principal) {
        String campusId = principal.getCampusId();
        return clearanceWorkflowService.listStudentOverviews(campusId);
    }
}
