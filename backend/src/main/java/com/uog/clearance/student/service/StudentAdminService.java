package com.uog.clearance.student.service;

import com.uog.clearance.audit.model.AuditAction;
import com.uog.clearance.audit.service.AuditLogService;
import com.uog.clearance.security.model.UserPrincipal;
import com.uog.clearance.student.dto.StudentIdentityResponse;
import com.uog.clearance.student.dto.BulkImportResult;
import com.uog.clearance.student.dto.CreateStudentRequest;
import com.uog.clearance.student.dto.StudentResponse;
import com.uog.clearance.student.dto.UpdateStudentRequest;
import java.nio.charset.StandardCharsets;
import com.uog.clearance.student.model.Student;
import com.uog.clearance.student.repository.StudentRepository;
import com.uog.clearance.user.model.User;
import com.uog.clearance.user.model.UserRole;
import com.uog.clearance.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import org.springframework.dao.DuplicateKeyException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class StudentAdminService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final StudentIdentityService studentIdentityService;

    public StudentResponse createStudent(CreateStudentRequest request, UserPrincipal principal) {
        String studentId = request.studentId() == null ? "" : request.studentId().trim();
        if (studentId.isBlank()) {
            throw new IllegalArgumentException("Student ID is required");
        }
        if (studentRepository.findByStudentIdIgnoreCase(studentId).isPresent()
                || userRepository.findByUsernameIgnoreCase(studentId).isPresent()) {
            throw new DuplicateKeyException("Student with this ID already exists");
        }

        User user = new User();
        user.setUsername(studentId);
        String password = request.temporaryPassword() == null || request.temporaryPassword().isBlank()
                ? studentId
                : request.temporaryPassword().trim();
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(UserRole.STUDENT);
        user.setCampusId(request.campusId() == null ? null : request.campusId().trim());
        user.setStudentId(studentId);
        user.setActive(true);
        user.setMustChangePassword(false);
        user.setCreatedBy(principal.getId());
        user = userRepository.save(user);

        Student student = new Student();
        student.setStudentId(studentId);
        student.setUserId(user.getId());
        student.setFirstName(request.firstName() == null ? null : request.firstName().trim());
        student.setMiddleName(emptyToNull(request.middleName()));
        student.setLastName(request.lastName() == null ? null : request.lastName().trim());
        student.setGender(emptyToNull(request.gender()));
        student.setPhone(emptyToNull(request.phone()));
        student.setEmail(emptyToNull(request.email()));
        student.setCampusId(request.campusId() == null ? null : request.campusId().trim());
        student.setAcademicDepartmentId(emptyToNull(request.academicDepartmentId()));
        student.setProgram(emptyToNull(request.program()));
        student.setAcademicYear(request.academicYear());
        student.setGraduationYear(request.graduationYear());
        student.setCreatedBy(principal.getId());
        student = studentRepository.save(student);

        Map<String, Object> createMeta = new java.util.LinkedHashMap<>();
        createMeta.put("campusId", student.getCampusId());
        createMeta.put("academicYear", student.getAcademicYear());
        auditLogService.log(
                principal,
                AuditAction.STUDENT_CREATED,
                "STUDENT",
                student.getId(),
                student.getStudentId(),
                "Created student account",
                createMeta);

        return toResponse(student);
    }

    public List<StudentResponse> listStudents() {
        return studentRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public StudentResponse getStudent(String studentId) {
        String key = studentId == null ? "" : studentId.trim();
        return studentRepository.findByStudentIdIgnoreCase(key)
                .map(this::toResponse)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
    }

    public StudentResponse updateStudent(String studentId, UpdateStudentRequest request, UserPrincipal principal) {
        String key = studentId == null ? "" : studentId.trim();
        Student student = studentRepository.findByStudentIdIgnoreCase(key)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        student.setFirstName(request.firstName() == null ? null : request.firstName().trim());
        student.setMiddleName(emptyToNull(request.middleName()));
        student.setLastName(request.lastName() == null ? null : request.lastName().trim());
        student.setGender(emptyToNull(request.gender()));
        student.setPhone(emptyToNull(request.phone()));
        student.setEmail(emptyToNull(request.email()));
        student.setCampusId(request.campusId() == null ? null : request.campusId().trim());
        student.setAcademicDepartmentId(emptyToNull(request.academicDepartmentId()));
        student.setProgram(emptyToNull(request.program()));
        student.setAcademicYear(request.academicYear());
        student.setGraduationYear(request.graduationYear());
        student = studentRepository.save(student);

        User user = userRepository.findById(student.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Linked user not found"));
        user.setCampusId(request.campusId() == null ? null : request.campusId().trim());
        userRepository.save(user);

        Map<String, Object> updateMeta = new java.util.LinkedHashMap<>();
        updateMeta.put("campusId", student.getCampusId());
        updateMeta.put("academicYear", student.getAcademicYear());
        auditLogService.log(
                principal,
                AuditAction.STUDENT_UPDATED,
                "STUDENT",
                student.getId(),
                student.getStudentId(),
                "Updated student account",
                updateMeta);

        return toResponse(student);
    }

    public StudentResponse activateStudent(String studentId, boolean active, UserPrincipal principal) {
        String key = studentId == null ? "" : studentId.trim();
        Student student = studentRepository.findByStudentIdIgnoreCase(key)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        User user = userRepository.findById(student.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Linked user not found"));
        user.setActive(active);
        userRepository.save(user);

        Map<String, Object> activateMeta = new java.util.LinkedHashMap<>();
        activateMeta.put("active", active);
        auditLogService.log(
                principal,
                AuditAction.STUDENT_STATUS_CHANGED,
                "STUDENT",
                student.getId(),
                student.getStudentId(),
                active ? "Activated student account" : "Deactivated student account",
                activateMeta);

        return toResponse(student);
    }

    public void deleteStudent(String studentId, UserPrincipal principal) {
        String key = studentId == null ? "" : studentId.trim();
        Student student = studentRepository.findByStudentIdIgnoreCase(key)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        // Remove linked user account too
        if (student.getUserId() != null) {
            userRepository.findById(student.getUserId()).ifPresent(userRepository::delete);
        }
        studentRepository.delete(student);

        Map<String, Object> deleteMeta = new java.util.LinkedHashMap<>();
        deleteMeta.put("studentId", studentId);
        auditLogService.log(
                principal,
                AuditAction.USER_DELETED,
                "STUDENT",
                student.getId(),
                student.getStudentId(),
                "Deleted student account",
                deleteMeta);
    }

    public StudentResponse resetStudentPassword(String studentId, String newPassword, UserPrincipal principal) {
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("New password is required");
        }
        String key = studentId == null ? "" : studentId.trim();
        Student student = studentRepository.findByStudentIdIgnoreCase(key)
                .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        User user = userRepository.findById(student.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Linked user not found"));
        user.setPasswordHash(passwordEncoder.encode(newPassword.trim()));
        user.setMustChangePassword(false);
        userRepository.save(user);

        Map<String, Object> resetMeta = new java.util.LinkedHashMap<>();
        resetMeta.put("studentId", studentId);
        auditLogService.log(
                principal,
                AuditAction.STUDENT_UPDATED,
                "STUDENT",
                student.getId(),
                student.getStudentId(),
                "Admin reset student password",
                resetMeta);

        return toResponse(student);
    }

    public BulkImportResult importStudents(MultipartFile file, UserPrincipal principal) {
        try {
            String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
            boolean isExcel = filename.endsWith(".xlsx") || filename.endsWith(".xls")
                    || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".equals(file.getContentType())
                    || "application/vnd.ms-excel".equals(file.getContentType());

            if (isExcel) {
                return importFromExcel(file, principal);
            } else {
                return importFromCsv(file, principal);
            }
        } catch (Exception ex) {
            throw new IllegalArgumentException("Unable to import file: " + ex.getMessage(), ex);
        }
    }

    private BulkImportResult importFromCsv(MultipartFile file, UserPrincipal principal) throws Exception {
        List<String> lines = new String(file.getBytes(), StandardCharsets.UTF_8).lines()
                .filter(line -> !line.isBlank())
                .toList();
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("CSV file is empty");
        }

        int imported = 0;
        List<String> errors = new ArrayList<>();

        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i);
            String[] parts = line.split(",", -1);
            if (parts.length < 12) {
                errors.add("Row " + (i + 1) + ": expected at least 12 columns, got " + parts.length);
                continue;
            }
            try {
                CreateStudentRequest request = buildRequestFromRow(
                        parts[0], parts[1], parts[2], parts[3],
                        parts[4], parts[5], parts[6], parts[7],
                        parts[8], parts[9], parts[10], parts[11],
                        parts.length > 12 ? parts[12] : null);
                createStudent(request, principal);
                imported++;
            } catch (Exception ex) {
                errors.add("Row " + (i + 1) + ": " + ex.getMessage());
            }
        }
        return new BulkImportResult(lines.size() - 1, imported, errors.size(), errors);
    }

    private BulkImportResult importFromExcel(MultipartFile file, UserPrincipal principal) throws Exception {
        try (org.apache.poi.ss.usermodel.Workbook workbook =
                     org.apache.poi.ss.usermodel.WorkbookFactory.create(file.getInputStream())) {

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.getSheetAt(0);
            int totalRows = 0;
            int imported = 0;
            List<String> errors = new ArrayList<>();

            // row 0 = header, start from 1
            for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                org.apache.poi.ss.usermodel.Row row = sheet.getRow(rowIdx);
                if (row == null) continue;

                // Check if row is entirely blank
                boolean allBlank = true;
                for (int c = 0; c < 12; c++) {
                    org.apache.poi.ss.usermodel.Cell cell = row.getCell(c);
                    if (cell != null && cell.getCellType() != org.apache.poi.ss.usermodel.CellType.BLANK) {
                        allBlank = false;
                        break;
                    }
                }
                if (allBlank) continue;

                totalRows++;
                if (row.getLastCellNum() < 12) {
                    errors.add("Row " + (rowIdx + 1) + ": expected at least 12 columns");
                    continue;
                }

                try {
                    CreateStudentRequest request = buildRequestFromRow(
                            cellString(row, 0),  // studentId
                            cellString(row, 1),  // firstName
                            cellString(row, 2),  // middleName
                            cellString(row, 3),  // lastName
                            cellString(row, 4),  // gender
                            cellString(row, 5),  // phone
                            cellString(row, 6),  // email
                            cellString(row, 7),  // campusId
                            cellString(row, 8),  // academicDepartmentId
                            cellString(row, 9),  // program
                            cellString(row, 10), // academicYear
                            cellString(row, 11), // graduationYear
                            row.getLastCellNum() > 12 ? cellString(row, 12) : null); // password
                    createStudent(request, principal);
                    imported++;
                } catch (Exception ex) {
                    errors.add("Row " + (rowIdx + 1) + ": " + ex.getMessage());
                }
            }
            return new BulkImportResult(totalRows, imported, errors.size(), errors);
        }
    }

    private String cellString(org.apache.poi.ss.usermodel.Row row, int col) {
        org.apache.poi.ss.usermodel.Cell cell = row.getCell(col);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                // Return as integer string if it is a whole number (e.g. year 2024)
                yield d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCachedFormulaResultType() == org.apache.poi.ss.usermodel.CellType.NUMERIC
                    ? String.valueOf((long) cell.getNumericCellValue())
                    : cell.getStringCellValue();
            default -> "";
        };
    }

    private CreateStudentRequest buildRequestFromRow(
            String studentId, String firstName, String middleName, String lastName,
            String gender, String phone, String email, String campusId,
            String academicDepartmentId, String program,
            String academicYearStr, String graduationYearStr,
            String temporaryPassword) {

        int academicYear;
        int graduationYear;
        try {
            academicYear = Integer.parseInt(academicYearStr.trim());
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Invalid academicYear: '" + academicYearStr + "'");
        }
        try {
            graduationYear = Integer.parseInt(graduationYearStr.trim());
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Invalid graduationYear: '" + graduationYearStr + "'");
        }

        return new CreateStudentRequest(
                studentId.trim(),
                firstName.trim(),
                emptyToNull(middleName),
                lastName.trim(),
                emptyToNull(gender),
                emptyToNull(phone),
                emptyToNull(email),
                campusId.trim(),
                emptyToNull(academicDepartmentId),
                emptyToNull(program),
                academicYear,
                graduationYear,
                emptyToNull(temporaryPassword));
    }

    private String emptyToNull(String value) {
        String trimmed = value == null ? null : value.trim();
        return trimmed == null || trimmed.isEmpty() ? null : trimmed;
    }

    private StudentResponse toResponse(Student student) {
        StudentIdentityResponse identity = studentIdentityService.toIdentityResponse(student);
        return new StudentResponse(
                student.getId(),
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
                identity.profileImageUrl(),
                identity.idCardImageUrl(),
                student.getStatus());
    }
}
