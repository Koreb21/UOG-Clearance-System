package com.uog.clearance.security.service;

import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.student.model.Student;
import com.uog.clearance.student.repository.StudentRepository;
import com.uog.clearance.user.model.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service("campusAccessService")
@RequiredArgsConstructor
public class CampusAccessService {

    private final StudentRepository studentRepository;

    public boolean canAccessCampus(UserPrincipal principal, String campusId) {
        if (principal == null) {
            return false;
        }
        if (principal.getUser().getRole() == UserRole.SYSTEM_ADMIN) {
            return true;
        }
        return principal.getCampusId() != null && principal.getCampusId().equals(campusId);
    }

    public boolean canAccessStudent(UserPrincipal principal, String studentId) {
        Student student = studentRepository.findByStudentId(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        return canAccessCampus(principal, student.getCampusId());
    }

    public void requireStudentAccess(UserPrincipal principal, String studentId) {
        if (!canAccessStudent(principal, studentId)) {
            throw new AccessDeniedException("You do not have access to this student");
        }
    }
}
