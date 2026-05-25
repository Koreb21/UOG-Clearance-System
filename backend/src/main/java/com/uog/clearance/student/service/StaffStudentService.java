package com.uog.clearance.student.service;

import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.student.dto.StudentResponse;
import com.uog.clearance.student.dto.StudentIdentityResponse;
import com.uog.clearance.student.model.Student;
import com.uog.clearance.student.repository.StudentRepository;
import com.uog.clearance.user.model.UserRole;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StaffStudentService {

    private final StudentRepository studentRepository;
    private final StudentIdentityService studentIdentityService;

    public List<StudentResponse> listVisibleStudents(UserPrincipal principal) {
        List<Student> students = principal.getUser().getRole() == UserRole.SYSTEM_ADMIN
                ? studentRepository.findAll()
                : studentRepository.findByCampusId(principal.getCampusId());

        return students
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public StudentResponse getVisibleStudent(UserPrincipal principal, String studentId) {
        Student student = studentRepository.findByStudentId(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        if (principal.getUser().getRole() != UserRole.SYSTEM_ADMIN
                && !student.getCampusId().equals(principal.getCampusId())) {
            throw new IllegalArgumentException("Student not found in your campus");
        }
        return toResponse(student);
    }

    private StudentResponse toResponse(Student student) {
        StudentIdentityResponse identity = studentIdentityService.toIdentityResponse(student);
        return new StudentResponse(
                student.getId(),
                student.getStudentId(),
                student.getFirstName(),
                student.getMiddleName(),
                student.getLastName(),
                student.getGender(),
                student.getPhone(),
                student.getEmail(),
                student.getCampusId(),
                student.getAcademicDepartmentId(),
                student.getProgram(),
                student.getAcademicYear(),
                student.getGraduationYear(),
                identity.profileImageUrl(),
                identity.idCardImageUrl(),
                student.getStatus());
    }
}
