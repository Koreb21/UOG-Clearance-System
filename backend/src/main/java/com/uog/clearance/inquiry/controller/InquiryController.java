package com.uog.clearance.inquiry.controller;

import com.uog.clearance.inquiry.dto.CreateInquiryRequest;
import com.uog.clearance.inquiry.dto.InquiryResponse;
import com.uog.clearance.inquiry.dto.RespondInquiryRequest;
import com.uog.clearance.inquiry.service.InquiryService;
import com.uog.clearance.security.model.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    @PostMapping("/students/me/inquiries")
    @PreAuthorize("hasRole('STUDENT')")
    public InquiryResponse createInquiry(@AuthenticationPrincipal UserPrincipal principal,
                                         @Valid @RequestBody CreateInquiryRequest request) {
        return inquiryService.createInquiry(principal, request);
    }

    @GetMapping("/students/me/inquiries")
    @PreAuthorize("hasRole('STUDENT')")
    public List<InquiryResponse> listStudentInquiries(@AuthenticationPrincipal UserPrincipal principal) {
        return inquiryService.listStudentInquiries(principal);
    }

    @GetMapping("/staff/inquiries")
    @PreAuthorize("hasAnyRole('LIBRARIAN','PROCTOR','CAFE_STAFF','DEPARTMENT_HEAD','STUDENT_DEAN','FINANCE_OFFICER','MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public List<InquiryResponse> listStaffInquiries(@AuthenticationPrincipal UserPrincipal principal) {
        return inquiryService.listStaffInquiries(principal);
    }

    @PatchMapping("/staff/inquiries/{inquiryId}/respond")
    @PreAuthorize("hasAnyRole('LIBRARIAN','PROCTOR','CAFE_STAFF','DEPARTMENT_HEAD','STUDENT_DEAN','FINANCE_OFFICER','MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public InquiryResponse respondInquiry(@AuthenticationPrincipal UserPrincipal principal,
                                          @PathVariable String inquiryId,
                                          @Valid @RequestBody RespondInquiryRequest request) {
        return inquiryService.respond(principal, inquiryId, request);
    }
}
