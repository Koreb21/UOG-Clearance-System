package com.uog.clearance.department.dto;

import com.uog.clearance.department.model.DepartmentType;

public record DepartmentResponse(
        String id,
        String code,
        String name,
        DepartmentType type,
        String campusId,
        boolean active
) {
}
