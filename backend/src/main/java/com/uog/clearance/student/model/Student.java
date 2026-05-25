package com.uog.clearance.student.model;

import com.uog.clearance.common.model.BaseDocument;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "students")
public class Student extends BaseDocument {

    @Column(name = "student_id", unique = true)
    private String studentId;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "middle_name")
    private String middleName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "gender")
    private String gender;

    @Column(name = "phone")
    private String phone;

    @Column(name = "email")
    private String email;

    @Column(name = "campus_id")
    private String campusId;

    @Column(name = "academic_department_id")
    private String academicDepartmentId;

    @Column(name = "program")
    private String program;

    @Column(name = "academic_year")
    private Integer academicYear;

    @Column(name = "graduation_year")
    private Integer graduationYear;

    @Column(name = "profile_image_path")
    private String profileImagePath;

    @Column(name = "profile_image_content_type")
    private String profileImageContentType;

    @Column(name = "id_card_image_path")
    private String idCardImagePath;

    @Column(name = "id_card_image_content_type")
    private String idCardImageContentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private StudentStatus status = StudentStatus.ACTIVE;

    @Column(name = "created_by")
    private String createdBy;
}
