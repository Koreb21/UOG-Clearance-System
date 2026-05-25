package com.uog.clearance.student.controller;

import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.student.dto.StudentResponse;
import com.uog.clearance.student.service.StaffStudentService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staff/students")
@RequiredArgsConstructor
public class StaffStudentController {

    private final StaffStudentService staffStudentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('LIBRARIAN','PROCTOR','CAFE_STAFF','DEPARTMENT_HEAD','STUDENT_DEAN','FINANCE_OFFICER','MAIN_REGISTRAR','SYSTEM_ADMIN')")
    public List<StudentResponse> listStudents(@AuthenticationPrincipal UserPrincipal principal) {
        return staffStudentService.listVisibleStudents(principal);
    }

    @GetMapping("/{studentId}")
    @PreAuthorize("hasAnyRole('LIBRARIAN','PROCTOR','CAFE_STAFF','DEPARTMENT_HEAD','STUDENT_DEAN','FINANCE_OFFICER','MAIN_REGISTRAR','SYSTEM_ADMIN') and @campusAccessService.canAccessStudent(principal, #studentId)")
    public StudentResponse getStudent(@AuthenticationPrincipal UserPrincipal principal,
                                      @PathVariable String studentId) {
        return staffStudentService.getVisibleStudent(principal, studentId);
    }
}
