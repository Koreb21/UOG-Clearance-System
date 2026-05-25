package com.uog.clearance.student.dto;

public record StudentIdentityResponse(
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
        boolean hasProfileImage,
        String profileImageUrl,
        boolean hasIdCardImage,
        String idCardImageUrl
) {
}
