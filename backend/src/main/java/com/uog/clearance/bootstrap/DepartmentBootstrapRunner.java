package com.uog.clearance.bootstrap;

import com.uog.clearance.department.model.Department;
import com.uog.clearance.department.model.DepartmentType;
import com.uog.clearance.department.repository.DepartmentRepository;
import java.util.Set;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DepartmentBootstrapRunner implements CommandLineRunner {

    private final DepartmentRepository departmentRepository;

    @Override
    public void run(String... args) {
        List<Department> departments = List.of(
                clearance("MARAKI", "LIB", "Library"),
                clearance("MARAKI", "PRO", "Proctor"),
                clearance("MARAKI", "CAF", "Cafe"),
                clearance("MARAKI", "FIN", "Finance"),
                clearance("MARAKI", "REG", "Registrar"),
                clearance("MARAKI", "DEAN", "Student Dean"),
                academic("MARAKI", "LAW", "Law"),
                academic("MARAKI", "MKT", "Marketing"),
                academic("MARAKI", "ACC", "Accounting"),
                academic("MARAKI", "MGT", "Management"),
                academic("MARAKI", "GIS", "Geo Information Science"),

                clearance("TEWODROS", "LIB", "Library"),
                clearance("TEWODROS", "PRO", "Proctor"),
                clearance("TEWODROS", "CAF", "Cafe"),
                clearance("TEWODROS", "FIN", "Finance"),
                clearance("TEWODROS", "REG", "Registrar"),
                clearance("TEWODROS", "DEAN", "Student Dean"),
                academic("TEWODROS", "CS", "Computer Science"),
                academic("TEWODROS", "ISYS", "Information Systems"),
                academic("TEWODROS", "ISCI", "Information Science"),
                academic("TEWODROS", "BIO", "Biotechnology"),
                academic("TEWODROS", "VET", "Veterinary Medicine"),
                academic("TEWODROS", "SPRT", "Sport Science"),
                academic("TEWODROS", "AGR", "Agriculture"),
                academic("TEWODROS", "AGEC", "Agro Economics"),

                clearance("FASIL", "LIB", "Library"),
                clearance("FASIL", "PRO", "Proctor"),
                clearance("FASIL", "CAF", "Cafe"),
                clearance("FASIL", "FIN", "Finance"),
                clearance("FASIL", "REG", "Registrar"),
                clearance("FASIL", "DEAN", "Student Dean"),
                academic("FASIL", "COTM", "Engineering - CoTM"),
                academic("FASIL", "ELEC", "Engineering - Electrical"),
                academic("FASIL", "ARCH", "Engineering - Architecture"),
                academic("FASIL", "MECH", "Engineering - Mechanical"),
                academic("FASIL", "CIVIL", "Engineering - Civil")
        );

        departments.forEach(this::upsert);
        deactivateLegacyAcademicDepartments("MARAKI", Set.of("LAW", "MKT", "ACC", "MGT", "GIS"));
        deactivateLegacyAcademicDepartments("TEWODROS", Set.of("CS", "ISYS", "ISCI", "BIO", "VET", "SPRT", "AGR", "AGEC"));
        deactivateLegacyAcademicDepartments("FASIL", Set.of("COTM", "ELEC", "ARCH", "MECH", "CIVIL"));
    }

    private Department clearance(String campusId, String code, String name) {
        return build(code, name, DepartmentType.CLEARANCE, campusId);
    }

    private Department academic(String campusId, String code, String name) {
        return build(code, name, DepartmentType.ACADEMIC, campusId);
    }

    private Department build(String code, String name, DepartmentType type, String campusId) {
        Department department = new Department();
        department.setCode(code);
        department.setName(name);
        department.setType(type);
        department.setCampusId(campusId);
        department.setActive(true);
        return department;
    }

    private void upsert(Department seed) {
        Department department = departmentRepository
                .findByCampusIdAndTypeAndCode(seed.getCampusId(), seed.getType(), seed.getCode())
                .orElseGet(Department::new);

        department.setCode(seed.getCode());
        department.setName(seed.getName());
        department.setType(seed.getType());
        department.setCampusId(seed.getCampusId());
        department.setActive(true);
        departmentRepository.save(department);
        log.debug("Seeded {} department {} for {}", seed.getType(), seed.getName(), seed.getCampusId());
    }

    private void deactivateLegacyAcademicDepartments(String campusId, Set<String> allowedCodes) {
        departmentRepository.findByCampusIdAndType(campusId, DepartmentType.ACADEMIC)
                .stream()
                .filter(department -> !allowedCodes.contains(department.getCode()))
                .filter(Department::isActive)
                .forEach(department -> {
                    department.setActive(false);
                    departmentRepository.save(department);
                    log.info("Deactivated legacy academic department {} ({}) for {}", department.getName(), department.getCode(), campusId);
                });
    }
}
