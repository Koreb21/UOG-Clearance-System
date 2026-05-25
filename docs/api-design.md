# API Design

Base path:

- `/api/v1`

## 1. Authentication

### `POST /auth/login`

Request:

- `username`
- `password`

Response:

- access token
- refresh token optional later
- user profile
- role
- campus

### `POST /auth/change-password`

For first login or password reset flow.

### `GET /auth/me`

Returns logged-in user profile and permissions.

## 2. Campuses and Reference Data

### `GET /campuses`

List campuses.

### `GET /departments`

List departments, optionally filtered by campus.

## 3. Student Administration

### `POST /admin/students`

Create one student.

### `POST /admin/students/import`

Bulk import students from CSV or Excel.

### `GET /admin/students`

Search and list students.

Query examples:

- `campusId`
- `departmentId`
- `academicYear`
- `status`

### `GET /admin/students/{studentId}`

Get a student profile.

### `PUT /admin/students/{studentId}`

Update student profile.

### `PATCH /admin/students/{studentId}/activate`

Activate or deactivate a student account.

### `POST /admin/students/{studentId}/profile-image`

Upload the official student profile image used by staff for remote identity checks.

### `POST /admin/students/{studentId}/id-card-image`

Upload the student ID-card image for additional verification.

### `POST /admin/staff-users`

Create one staff account.

### `GET /admin/staff-users`

List staff accounts.

### `GET /admin/staff-users/{userId}`

Get one staff account.

### `PUT /admin/staff-users/{userId}`

Update a staff account.

### `PATCH /admin/staff-users/{userId}/activate`

Activate or deactivate a staff account.

## 4. Student Self-Service

### `GET /students/me/profile`

Get own profile.

### `PUT /students/me/profile`

Update allowed fields only.

### `POST /students/me/clearance-requests`

Create or submit a clearance request.

### `GET /students/me/clearance-requests`

List own clearance requests.

### `GET /students/me/clearance-requests/{requestId}`

Get request summary.

### `GET /students/me/clearance-requests/{requestId}/status`

Get all checks, liabilities, payments, certificate state, and trusted student identity summary.

### `GET /students/{studentId}/identity`

Get the trusted student identity profile and media URLs.

### `GET /students/me/clearance-requests/{requestId}/certificate`

Download QR certificate if cleared.

## 5. Department Review Workflows

### `GET /staff/students`

List students visible to the logged-in staff member based on campus and department rules.

### `GET /staff/students/{studentId}/clearance`

Get student clearance details visible to the staff member.

### `POST /staff/liabilities`

Create a liability.

Request fields:

- `studentId`
- `clearanceRequestId`
- `departmentCheckCode`
- `itemName`
- `description`
- `amount`

### `PUT /staff/liabilities/{liabilityId}`

Update a liability.

### `PATCH /staff/liabilities/{liabilityId}/clear`

Clear or resolve a liability.

Request fields:

- `status` (`PENDING`, `PARTIALLY_PAID`, `PAID`, `WAIVED`, `CLEARED`)
- `note`

### `PATCH /staff/checks/{checkId}/review`

Approve, flag, fail, or clear a departmental check.

Request fields:

- `status`
- `comment`

Validation examples:

- Librarian can only review `LIBRARY`
- Department Head can only review `DEPARTMENT_HEAD`
- Student Dean can only review `STUDENT_DEAN`

## 6. Finance

### `POST /payments/chapa/initiate`

Creates Chapa transaction payload and transaction reference.

### `POST /payments/chapa/callback`

Receives Chapa callback redirects and should trigger verify-by-`tx_ref`.

### `GET /payments/chapa/callback`

Receives Chapa redirect query parameters after payment completion.

### `POST /payments/chapa/webhook`

Receives Chapa webhook payloads and validates signature when configured.

### `PATCH /payments/chapa/verify/{txRef}`

Backend verification of Chapa status.

### `POST /finance/payments/manual`

Record manual bank-slip payment.

### `GET /finance/payments`

List payment records and statuses.

### `POST /registrar/clearance-requests/{requestId}/generate-certificate`

Generate QR certificate after all non-registrar checks are cleared.

### `PATCH /finance/checks/{checkId}/approve`

Approve finance step after reconciliation.

## 7. Status Inquiries

### `POST /students/me/inquiries`

Create inquiry to a department.

### `GET /students/me/inquiries`

List own inquiries.

### `PATCH /staff/inquiries/{inquiryId}/respond`

Department response.

## 8. Registrar

### `GET /registrar/clearance-requests`

List requests ready for final validation.

### `GET /registrar/clearance-requests/{requestId}`

Full request summary.

### `POST /registrar/clearance-requests/{requestId}/close`

Close the file only after QR generation and QR verification.

### `POST /registrar/qr/verify`

Verify scanned QR payload.

## 9. Audit and Monitoring

### `GET /admin/audit-logs`

Search audit logs.

### `GET /admin/system/health`

Basic service health and node status.

## Authorization Rules

- Every endpoint must enforce role checks.
- Student endpoints must only access own records.
- Staff endpoints must filter by campus.
- System Admin endpoints may operate globally.
- Payment callbacks must be treated only as triggers; actual clearance should depend on server-side verify results.
- Webhook requests should be validated by signature or equivalent provider-authenticated mechanism.
