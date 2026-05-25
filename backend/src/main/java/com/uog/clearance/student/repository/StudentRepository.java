package com.uog.clearance.student.repository;

import com.uog.clearance.student.model.Student;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StudentRepository extends MongoRepository<Student, String> {

    Optional<Student> findByStudentId(String studentId);

    Optional<Student> findByStudentIdIgnoreCase(String studentId);

    Optional<Student> findFirstByEmailIgnoreCase(String email);

    List<Student> findByCampusId(String campusId);

    Optional<Student> findFirstByStudentIdRegexIgnoreCase(String pattern);

    Optional<Student> findFirstByEmailRegexIgnoreCase(String pattern);
}
