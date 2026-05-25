# Final Requirements

## 1. Project Goal

Build a university clearance system for the University of Gondar that serves three campuses under one platform:

- Atse Tewodros
- Maraki
- Atse Fasil

The platform must support student clearance requests, departmental verification, payment handling, final validation, and QR-based completion.

## 2. Business Scope

The system handles end-of-semester or end-of-academic-period clearance for students.

Each student belongs to one campus.
Each staff member belongs to one campus.
Campus rules must be enforced by the backend, not only by the UI.

## 3. Supported Platforms

- Student mobile app using React Native
- Student web portal using React
- Staff and admin web dashboard using React
- Backend REST API using Spring Boot
- MongoDB database

## 4. Functional Requirements

### 4.1 Authentication and Access

- Users must log in before accessing protected features.
- Authentication uses JWT.
- Passwords are stored with BCrypt hashing.
- The system must support role-based access control.
- The system must support campus-based authorization.

### 4.2 Student Management

- Students are created by the Super Admin only.
- Students cannot self-register online.
- Student profiles include campus, department, academic year, graduation year, and status.
- Students can update allowed personal profile fields after first login.

### 4.3 Clearance Request Flow

- A student initiates a clearance request for a specific semester or academic cycle.
- The request is tied to the student's campus.
- The system creates a campus-specific clearance record with required department checks.
- Students can track progress in real time.

### 4.4 Department Verification

The following 8 actors participate in the system:

- Library staff
- Proctor staff
- Cafe staff
- Department Head
- Student Dean
- Finance Office
- Main Registrar
- System Administrator
- Student

Department approval rules:

- Library verifies borrowed items and fines.
- Proctor verifies dormitory property, key return, and room obligations.
- Cafe verifies cafeteria obligations.
- Department Head approves pass or fail based on academic result for the academic year.
- Student Dean approves or flags based on conduct and discipline.
- Finance verifies paid and unpaid liabilities, including Chapa and manual bank-slip records.
- Main Registrar performs the final validation and closes the file after all required checks pass.

### 4.5 Liability Management

- Staff can create liabilities for students in their campus only.
- Liabilities may include books, dorm assets, meal obligations, disciplinary fines, or other approved categories.
- A liability must contain the creator staff ID, department, campus, amount, and timestamp.
- A liability can be marked pending, paid, waived, or cleared.

### 4.6 Payments

- Students can pay eligible financial liabilities through Chapa.
- The backend generates a payment transaction reference.
- The backend must verify payment success using Chapa server-side verification.
- The mobile or web client must never be trusted as proof of payment.
- Finance can also record manual bank-slip payments where policy allows.

### 4.7 Status Tracking and Inquiry

- Students can view all department statuses.
- Students can see comments or inquiry responses from departments.
- Students can see the last synced status when offline in the mobile app.

### 4.8 Final Clearance and QR Certificate

- A QR certificate is generated only when all required checks are cleared.
- The QR payload must contain a signed verification token.
- The token should include student ID, campus, clearance request ID, and graduation year.
- The registrar can scan or verify the QR before closing the file.

### 4.9 Audit and Monitoring

- Every approval, rejection, liability creation, payment verification, and registrar closure must be logged.
- Logs must include actor ID, role, campus, action type, target entity, timestamp, and metadata.

## 5. Non-Functional Requirements

### 5.1 Security

- Enforce backend authorization for role and campus.
- Use JWT access tokens.
- Hash passwords with BCrypt.
- Validate all incoming request payloads.
- Record security-sensitive actions in audit logs.

### 5.2 Performance

- The system should support concurrent requests from multiple campuses.
- Student status retrieval should be fast enough for mobile use on low-end Android devices.

### 5.3 Availability and Reliability

- Mobile clients should cache the last successful clearance status response.
- Payment verification should be retried or safely reconciled if callback delivery fails.

### 5.4 Maintainability

- Keep backend modules separated by domain.
- Use DTOs and validation at API boundaries.
- Keep frontend applications modular and role-aware.

## 6. Assumptions

- One student belongs to one campus at a time.
- One staff account belongs to one campus at a time, except Super Admin.
- Main Registrar may be global or campus-specific; initial implementation should support campus-specific registrar assignment and optional global oversight later.
- The first release will support English UI text unless Amharic localization is added later.

## 7. Open Decisions to Confirm Later

- Exact list of status inquiry message rules
- Whether registrar is one global office or per-campus registrar accounts
- Whether some departments are optional for specific student categories
- Whether clearance runs per semester, per graduation cycle, or both
