package com.uog.clearance.department.repository;

import com.uog.clearance.department.model.Department;
import com.uog.clearance.department.model.DepartmentType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DepartmentRepository extends MongoRepository<Department, String> {

    List<Department> findByCampusId(String campusId);

    List<Department> findByCampusIdAndType(String campusId, DepartmentType type);

    Optional<Department> findByCampusIdAndTypeAndCode(String campusId, DepartmentType type, String code);
}
