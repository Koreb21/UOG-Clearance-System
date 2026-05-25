package com.uog.clearance.student.controller;

import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.student.dto.StudentIdentityResponse;
import com.uog.clearance.student.service.StudentIdentityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class StudentIdentityController {

    private final StudentIdentityService studentIdentityService;

    @PostMapping("/admin/students/{studentId}/profile-image")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public StudentIdentityResponse uploadProfileImage(@PathVariable String studentId,
                                                      @RequestPart("file") MultipartFile file,
                                                      @AuthenticationPrincipal UserPrincipal principal) {
        return studentIdentityService.uploadProfileImage(studentId, file, principal);
    }

    @PostMapping("/admin/students/{studentId}/id-card-image")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public StudentIdentityResponse uploadIdCardImage(@PathVariable String studentId,
                                                     @RequestPart("file") MultipartFile file,
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        return studentIdentityService.uploadIdCardImage(studentId, file, principal);
    }

    @GetMapping("/students/{studentId}/identity")
    @PreAuthorize("isAuthenticated()")
    public StudentIdentityResponse getIdentity(@PathVariable String studentId,
                                               @AuthenticationPrincipal UserPrincipal principal) {
        return studentIdentityService.getIdentity(principal, studentId);
    }

    @GetMapping("/students/{studentId}/media/profile-image")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getProfileImage(@PathVariable String studentId,
                                             @AuthenticationPrincipal UserPrincipal principal) {
        StudentIdentityService.MediaResource media = studentIdentityService.loadProfileImage(principal, studentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(media.contentType()))
                .body(media.resource());
    }

    @GetMapping("/students/{studentId}/media/id-card-image")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getIdCardImage(@PathVariable String studentId,
                                            @AuthenticationPrincipal UserPrincipal principal) {
        StudentIdentityService.MediaResource media = studentIdentityService.loadIdCardImage(principal, studentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(media.contentType()))
                .body(media.resource());
    }
}
