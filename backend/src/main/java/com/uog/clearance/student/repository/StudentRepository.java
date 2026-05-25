package com.uog.clearance.student.repository;

import com.uog.clearance.student.model.Student;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentRepository extends JpaRepository<Student, String> {

    Optional<Student> findByStudentId(String studentId);

    Optional<Student> findByStudentIdIgnoreCase(String studentId);

    Optional<Student> findFirstByEmailIgnoreCase(String email);

    List<Student> findByCampusId(String campusId);

    @Query("SELECT s FROM Student s WHERE LOWER(s.studentId) LIKE LOWER(:pattern)")
    Optional<Student> findFirstByStudentIdRegexIgnoreCase(@Param("pattern") String pattern);

    @Query("SELECT s FROM Student s WHERE LOWER(s.email) LIKE LOWER(:pattern)")
    Optional<Student> findFirstByEmailRegexIgnoreCase(@Param("pattern") String pattern);
}
