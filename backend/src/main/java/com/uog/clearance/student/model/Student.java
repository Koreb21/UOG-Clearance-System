package com.uog.clearance.student.model;

import com.uog.clearance.common.model.BaseDocument;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "students")
public class Student extends BaseDocument {

    @Indexed(unique = true)
    private String studentId;

    private String userId;

    private String firstName;

    private String middleName;

    private String lastName;

    private String gender;

    private String phone;

    @Indexed
    private String email;

    private String campusId;

    private String academicDepartmentId;

    private String program;

    private Integer academicYear;

    private Integer graduationYear;

    private String profileImagePath;

    private String profileImageContentType;

    private String idCardImagePath;

    private String idCardImageContentType;

    private StudentStatus status = StudentStatus.ACTIVE;

    private String createdBy;
}
