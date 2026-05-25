package com.uog.clearance.student.dto;

import com.uog.clearance.student.model.StudentStatus;

public record StudentResponse(
        String id,
        String studentId,
        String firstName,
        String middleName,
        String lastName,
        String gender,
        String phone,
        String email,
        String campusId,
        String academicDepartmentId,
        String program,
        Integer academicYear,
        Integer graduationYear,
        String profileImageUrl,
        String idCardImageUrl,
        StudentStatus status
) {
}
