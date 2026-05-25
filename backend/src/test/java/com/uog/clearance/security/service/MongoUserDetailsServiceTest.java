package com.uog.clearance.security.service;

import com.uog.clearance.student.model.Student;
import com.uog.clearance.student.repository.StudentRepository;
import com.uog.clearance.user.model.User;
import com.uog.clearance.user.model.UserRole;
import com.uog.clearance.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.uog.clearance.security.model.UserPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MongoUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentRepository studentRepository;

    private MongoUserDetailsService service;

    @BeforeEach
    void setUp() {
        service = new MongoUserDetailsService(userRepository, studentRepository);
    }

    @Test
    void loadUserByUsername_shouldUseStudentCampusWhenUserCampusIsMissing() {
        Student student = new Student();
        student.setStudentId("UGR/3141/22");
        student.setUserId("user-123");
        student.setCampusId("MARAKI");

        User user = new User();
        user.setId("user-123");
        user.setUsername("UGR/3141/22");
        user.setPasswordHash("password-hash");
        user.setRole(UserRole.STUDENT);
        user.setStudentId("UGR/3141/22");

        when(userRepository.findByUsernameIgnoreCase("UGR/3141/22")).thenReturn(Optional.of(user));
        when(studentRepository.findByStudentIdIgnoreCase("UGR/3141/22")).thenReturn(Optional.of(student));

        UserDetails principal = service.loadUserByUsername("UGR/3141/22");

        assertThat(principal).isInstanceOf(UserPrincipal.class);
        assertThat(((UserPrincipal) principal).getCampusId()).isEqualTo("MARAKI");
        verify(userRepository).save(user);
    }

    @Test
    void loadUserByUsername_shouldThrowWhenUserNotFound() {
        when(userRepository.findByUsernameIgnoreCase("unknown")).thenReturn(Optional.empty());
        when(studentRepository.findByStudentIdIgnoreCase("unknown")).thenReturn(Optional.empty());
        when(studentRepository.findFirstByEmailIgnoreCase("unknown")).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername("unknown"));
    }
}
