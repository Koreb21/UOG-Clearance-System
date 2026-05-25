package com.uog.clearance.security.service;

import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.student.model.Student;
import com.uog.clearance.student.repository.StudentRepository;
import com.uog.clearance.user.model.User;
import com.uog.clearance.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MongoUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String key = username == null ? "" : username.trim();
        if (key.isEmpty()) {
            throw new UsernameNotFoundException("User not found");
        }

        return userRepository.findByUsernameIgnoreCase(key)
                .map(this::buildPrincipal)
                .orElseGet(() -> studentRepository.findByStudentIdIgnoreCase(key)
                        .flatMap(student -> userRepository.findById(student.getUserId())
                                .map(user -> buildPrincipal(user, student)))
                        .orElseGet(() -> studentRepository.findFirstByEmailIgnoreCase(key)
                                .flatMap(student -> userRepository.findById(student.getUserId())
                                        .map(user -> buildPrincipal(user, student)))
                                .orElseThrow(() -> new UsernameNotFoundException("User not found"))));
    }

    private UserPrincipal buildPrincipal(User user) {
        return buildPrincipal(user, null);
    }

    private UserPrincipal buildPrincipal(User user, Student student) {
        boolean updatedCampus = false;
        if (user.getCampusId() == null || user.getCampusId().isBlank()) {
            if (student != null) {
                String studentCampusId = student.getCampusId();
                if (studentCampusId != null && !studentCampusId.isBlank()) {
                    user.setCampusId(studentCampusId);
                    updatedCampus = true;
                }
            } else if (user.getStudentId() != null && !user.getStudentId().isBlank()) {
                updatedCampus = studentRepository.findByStudentIdIgnoreCase(user.getStudentId())
                        .map(Student::getCampusId)
                        .filter(campusId -> campusId != null && !campusId.isBlank())
                        .map(campusId -> {
                            user.setCampusId(campusId);
                            return true;
                        })
                        .orElse(false);
            }
        }
        if (updatedCampus) {
            userRepository.save(user);
        }
        return new UserPrincipal(user);
    }
}
