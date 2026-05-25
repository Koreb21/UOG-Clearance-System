package com.uog.clearance.student.controller;

import com.uog.clearance.common.dto.ActivationRequest;
import com.uog.clearance.student.dto.BulkImportResult;
import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.student.dto.CreateStudentRequest;
import com.uog.clearance.student.dto.StudentResponse;
import com.uog.clearance.student.dto.UpdateStudentRequest;
import com.uog.clearance.student.service.StudentAdminService;
import com.uog.clearance.user.dto.ResetPasswordRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/admin/students")
@RequiredArgsConstructor
public class StudentAdminController {

    private final StudentAdminService studentAdminService;

    @PostMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public StudentResponse createStudent(@Valid @RequestBody CreateStudentRequest request,
                                         @AuthenticationPrincipal UserPrincipal principal) {
        return studentAdminService.createStudent(request, principal);
    }

    @PostMapping("/import")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public BulkImportResult importStudents(@RequestParam("file") MultipartFile file,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return studentAdminService.importStudents(file, principal);
    }

    @GetMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public List<StudentResponse> listStudents() {
        return studentAdminService.listStudents();
    }

    @GetMapping("/{studentId}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public StudentResponse getStudent(@PathVariable String studentId) {
        return studentAdminService.getStudent(studentId);
    }

    @PutMapping("/{studentId}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public StudentResponse updateStudent(@PathVariable String studentId,
                                         @Valid @RequestBody UpdateStudentRequest request,
                                         @AuthenticationPrincipal UserPrincipal principal) {
        return studentAdminService.updateStudent(studentId, request, principal);
    }

    @PatchMapping("/{studentId}/activate")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public StudentResponse activateStudent(@PathVariable String studentId,
                                           @RequestBody ActivationRequest request,
                                           @AuthenticationPrincipal UserPrincipal principal) {
        return studentAdminService.activateStudent(studentId, request.active(), principal);
    }

    @DeleteMapping("/{studentId}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public void deleteStudent(@PathVariable String studentId,
                              @AuthenticationPrincipal UserPrincipal principal) {
        studentAdminService.deleteStudent(studentId, principal);
    }

    @PatchMapping("/{studentId}/reset-password")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public StudentResponse resetStudentPassword(@PathVariable String studentId,
                                                @Valid @RequestBody ResetPasswordRequest request,
                                                @AuthenticationPrincipal UserPrincipal principal) {
        return studentAdminService.resetStudentPassword(studentId, request.newPassword(), principal);
    }
}
