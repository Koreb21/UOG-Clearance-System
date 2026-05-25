package com.uog.clearance.student.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateStudentRequest(
        @NotBlank String studentId,
        @NotBlank String firstName,
        String middleName,
        @NotBlank String lastName,
        String gender,
        String phone,
        String email,
        @NotBlank String campusId,
        String academicDepartmentId,
        String program,
        @NotNull Integer academicYear,
        @NotNull Integer graduationYear,
        String temporaryPassword
) {
}
