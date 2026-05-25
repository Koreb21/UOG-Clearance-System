package com.uog.clearance.department.model;

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
@Table(name = "departments")
public class Department extends BaseDocument {

    @Column(name = "code")
    private String code;

    @Column(name = "name")
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private DepartmentType type;

    @Column(name = "campus_id")
    private String campusId;

    @Column(name = "is_active")
    private boolean active = true;
}
