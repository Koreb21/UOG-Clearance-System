package com.uog.clearance.department.controller;

import com.uog.clearance.department.dto.DepartmentResponse;
import com.uog.clearance.department.service.DepartmentService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentService departmentService;

    @GetMapping
    public List<DepartmentResponse> listDepartments(@RequestParam(required = false) String campusId) {
        return departmentService.listDepartments(campusId);
    }
}
