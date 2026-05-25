package com.uog.clearance.department.model;

import com.uog.clearance.common.model.BaseDocument;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Document(collection = "departments")
public class Department extends BaseDocument {

    private String code;

    private String name;

    private DepartmentType type;

    private String campusId;

    private boolean active = true;
}
