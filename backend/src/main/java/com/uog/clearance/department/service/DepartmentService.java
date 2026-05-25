package com.uog.clearance.department.service;

import com.uog.clearance.department.dto.DepartmentResponse;
import com.uog.clearance.department.repository.DepartmentRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public List<DepartmentResponse> listDepartments(String campusId) {
        return (campusId == null || campusId.isBlank()
                ? departmentRepository.findAll()
                : departmentRepository.findByCampusId(campusId))
                .stream()
                .map(department -> new DepartmentResponse(
                        department.getId(),
                        department.getCode(),
                        department.getName(),
                        department.getType(),
                        department.getCampusId(),
                        department.isActive()))
                .toList();
    }
}
