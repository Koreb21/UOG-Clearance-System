package com.uog.clearance.student.service;

import com.uog.clearance.audit.model.AuditAction;
import com.uog.clearance.audit.service.AuditLogService;
import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.security.service.CampusAccessService;
import com.uog.clearance.student.config.StudentMediaProperties;
import com.uog.clearance.student.dto.StudentIdentityResponse;
import com.uog.clearance.student.model.Student;
import com.uog.clearance.student.repository.StudentRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class StudentIdentityService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE,
            "image/webp");

    private final StudentRepository studentRepository;
    private final CampusAccessService campusAccessService;
    private final AuditLogService auditLogService;
    private final StudentMediaProperties studentMediaProperties;

    public StudentIdentityResponse getIdentity(UserPrincipal principal, String studentId) {
        Student student = getAccessibleStudent(principal, studentId);
        return toIdentityResponse(student);
    }

    public StudentIdentityResponse uploadProfileImage(String studentId, MultipartFile file, UserPrincipal principal) {
        Student student = getStudent(studentId);
        validateImage(file);
        String storedPath = storeFile(studentId, "profile", file);
        student.setProfileImagePath(storedPath);
        student.setProfileImageContentType(file.getContentType());
        studentRepository.save(student);

        auditLogService.log(
                principal,
                AuditAction.STUDENT_MEDIA_UPDATED,
                "STUDENT",
                student.getId(),
                student.getStudentId(),
                "Uploaded official student profile image",
                Map.of("type", "profileImage"));

        return toIdentityResponse(student);
    }

    public StudentIdentityResponse uploadIdCardImage(String studentId, MultipartFile file, UserPrincipal principal) {
        Student student = getStudent(studentId);
        validateImage(file);
        String storedPath = storeFile(studentId, "id-card", file);
        student.setIdCardImagePath(storedPath);
        student.setIdCardImageContentType(file.getContentType());
        studentRepository.save(student);

        auditLogService.log(
                principal,
                AuditAction.STUDENT_MEDIA_UPDATED,
                "STUDENT",
                student.getId(),
                student.getStudentId(),
                "Uploaded student ID card image",
                Map.of("type", "idCardImage"));

        return toIdentityResponse(student);
    }

    public MediaResource loadProfileImage(UserPrincipal principal, String studentId) {
        Student student = getAccessibleStudent(principal, studentId);
        return loadMedia(student.getProfileImagePath(), student.getProfileImageContentType(), "Student profile image");
    }

    public MediaResource loadIdCardImage(UserPrincipal principal, String studentId) {
        Student student = getAccessibleStudent(principal, studentId);
        return loadMedia(student.getIdCardImagePath(), student.getIdCardImageContentType(), "Student ID card image");
    }

    private MediaResource loadMedia(String storedPath, String contentType, String description) {
        if (!StringUtils.hasText(storedPath)) {
            throw new IllegalArgumentException(description + " not found");
        }
        try {
            Path path = resolveStoragePath(storedPath);
            Resource resource = new ByteArrayResource(Files.readAllBytes(path));
            return new MediaResource(resource, contentType == null ? MediaType.APPLICATION_OCTET_STREAM_VALUE : contentType);
        } catch (IOException ex) {
            throw new IllegalArgumentException(description + " not found");
        }
    }

    private Student getAccessibleStudent(UserPrincipal principal, String studentId) {
        Student student = getStudent(studentId);
        if (principal.getStudentId() != null && principal.getStudentId().equals(studentId)) {
            return student;
        }
        campusAccessService.requireStudentAccess(principal, studentId);
        return student;
    }

    private Student getStudent(String studentId) {
        return studentRepository.findByStudentId(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("Only JPEG, PNG, or WEBP images are allowed");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Image file must not exceed 5MB");
        }
    }

    private String storeFile(String studentId, String type, MultipartFile file) {
        try {
            String extension = determineExtension(file.getContentType(), file.getOriginalFilename());
            Path directory = baseDirectory().resolve(studentId);
            Files.createDirectories(directory);
            String filename = type + "-" + UUID.randomUUID() + extension;
            Path target = directory.resolve(filename).normalize();
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return baseDirectory().relativize(target).toString().replace("\\", "/");
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to store image file", ex);
        }
    }

    private String determineExtension(String contentType, String originalFilename) {
        if (MediaType.IMAGE_JPEG_VALUE.equals(contentType)) {
            return ".jpg";
        }
        if (MediaType.IMAGE_PNG_VALUE.equals(contentType)) {
            return ".png";
        }
        if ("image/webp".equals(contentType)) {
            return ".webp";
        }
        if (originalFilename != null && originalFilename.contains(".")) {
            return originalFilename.substring(originalFilename.lastIndexOf('.'));
        }
        throw new AccessDeniedException("Unsupported image type");
    }

    private Path baseDirectory() {
        return Paths.get(studentMediaProperties.getStudentMediaDir()).toAbsolutePath().normalize();
    }

    private Path resolveStoragePath(String storedPath) {
        Path path = baseDirectory().resolve(storedPath).normalize();
        if (!path.startsWith(baseDirectory())) {
            throw new AccessDeniedException("Invalid media path");
        }
        return path;
    }

    public StudentIdentityResponse toIdentityResponse(Student student) {
        return new StudentIdentityResponse(
                student.getStudentId(),
                student.getFirstName(),
                student.getMiddleName(),
                student.getLastName(),
                student.getGender(),
                student.getPhone(),
                student.getEmail(),
                student.getCampusId(),
                student.getAcademicDepartmentId(),
                student.getProgram(),
                student.getAcademicYear(),
                student.getGraduationYear(),
                StringUtils.hasText(student.getProfileImagePath()),
                StringUtils.hasText(student.getProfileImagePath())
                        ? "/api/v1/students/" + student.getStudentId() + "/media/profile-image"
                        : null,
                StringUtils.hasText(student.getIdCardImagePath()),
                StringUtils.hasText(student.getIdCardImagePath())
                        ? "/api/v1/students/" + student.getStudentId() + "/media/id-card-image"
                        : null
        );
    }

    public record MediaResource(Resource resource, String contentType) {
    }
}
