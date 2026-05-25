# Database Collections Design

MongoDB is document-oriented, but we should still keep entities well-structured and avoid over-embedding high-change workflows.

## 1. `campuses`

Stores supported campuses.

Suggested fields:

- `_id`
- `code` (`TEWODROS`, `MARAKI`, `FASIL`)
- `name`
- `isActive`
- `createdAt`
- `updatedAt`

## 2. `departments`

Stores clearance-processing departments and academic departments.

Suggested fields:

- `_id`
- `code`
- `name`
- `type` (`CLEARANCE`, `ACADEMIC`)
- `campusId`
- `isActive`
- `createdAt`
- `updatedAt`

## 3. `users`

Authentication and identity record for all accounts.

Suggested fields:

- `_id`
- `username`
- `passwordHash`
- `role`
- `campusId`
- `departmentId` nullable
- `isActive`
- `mustChangePassword`
- `lastLoginAt`
- `createdBy`
- `createdAt`
- `updatedAt`

Notes:

- Students should also have a user account record, but their domain details belong in `students`.
- Super Admin can have `campusId = null` for global access.

## 4. `students`

Student domain profile.

Suggested fields:

- `_id`
- `studentId` unique
- `userId`
- `firstName`
- `middleName`
- `lastName`
- `gender`
- `phone`
- `email`
- `campusId`
- `academicDepartmentId`
- `program`
- `academicYear`
- `graduationYear`
- `status` (`ACTIVE`, `GRADUATED`, `WITHDRAWN`, `SUSPENDED`)
- `createdBy`
- `createdAt`
- `updatedAt`

## 5. `clearance_requests`

One request per clearance cycle.

Suggested fields:

- `_id`
- `requestNumber`
- `studentId`
- `campusId`
- `semester`
- `academicYearLabel`
- `requestType` (`SEMESTER`, `FINAL`, `WITHDRAWAL`)
- `status` (`DRAFT`, `SUBMITTED`, `IN_REVIEW`, `PAYMENT_PENDING`, `REJECTED`, `CLEARED`, `CLOSED`)
- `submittedAt`
- `closedAt`
- `createdAt`
- `updatedAt`

## 6. `clearance_checks`

Stores per-step status for each clearance request.

Suggested fields:

- `_id`
- `clearanceRequestId`
- `studentId`
- `campusId`
- `checkCode` (`LIBRARY`, `PROCTOR`, `CAFE`, `DEPARTMENT_HEAD`, `STUDENT_DEAN`, `FINANCE`, `REGISTRAR`)
- `status` (`PENDING`, `IN_REVIEW`, `FLAGGED`, `FAILED`, `CLEARED`)
- `assignedDepartmentId` nullable
- `reviewedBy`
- `reviewedAt`
- `comment`
- `metadata`
- `createdAt`
- `updatedAt`

Notes:

- This collection gives flexibility instead of hardcoding booleans inside one document.
- The QR generation service can aggregate these records.

## 7. `liabilities`

Stores issues or debts raised by staff.

Suggested fields:

- `_id`
- `clearanceRequestId`
- `studentId`
- `campusId`
- `departmentCheckCode`
- `category`
- `itemName`
- `description`
- `amount`
- `currency`
- `status` (`PENDING`, `PARTIALLY_PAID`, `PAID`, `WAIVED`, `CLEARED`)
- `paymentRequired`
- `createdBy`
- `updatedBy`
- `createdAt`
- `updatedAt`

## 8. `payments`

Stores payment attempts and reconciliations.

Suggested fields:

- `_id`
- `clearanceRequestId`
- `studentId`
- `campusId`
- `liabilityIds`
- `provider` (`CHAPA`, `BANK_SLIP`)
- `txRef`
- `providerReference`
- `amount`
- `currency`
- `status` (`INITIATED`, `PENDING_VERIFY`, `SUCCESS`, `FAILED`, `CANCELLED`)
- `verificationPayload`
- `createdBy` nullable
- `verifiedBy` nullable
- `verifiedAt` nullable
- `createdAt`
- `updatedAt`

## 9. `status_inquiries`

Messages from students to departments and responses back.

Suggested fields:

- `_id`
- `clearanceRequestId`
- `studentId`
- `campusId`
- `targetCheckCode`
- `message`
- `response`
- `status` (`OPEN`, `ANSWERED`, `CLOSED`)
- `createdAt`
- `respondedAt`

## 10. `audit_logs`

Immutable log for sensitive actions.

Suggested fields:

- `_id`
- `actorUserId`
- `actorRole`
- `campusId`
- `action`
- `entityType`
- `entityId`
- `targetStudentId` nullable
- `description`
- `metadata`
- `createdAt`

## 11. `qr_certificates`

Stores generated clearance certificates.

Suggested fields:

- `_id`
- `clearanceRequestId`
- `studentId`
- `campusId`
- `hash`
- `signedPayload`
- `base64Qr`
- `generatedAt`
- `verifiedAt` nullable
- `verifiedBy` nullable

## Key Indexes

- `students.studentId` unique
- `users.username` unique
- `clearance_requests.requestNumber` unique
- `clearance_checks.clearanceRequestId + checkCode` unique
- `payments.txRef` unique
- `audit_logs.targetStudentId + createdAt`

## Registration Approach for Students

Since students cannot self-register:

- Super Admin imports students individually or in bulk
- The system creates a `users` record and a linked `students` record
- A default password is generated or assigned
- The student changes the password at first login

Recommended later import options:

- CSV import from registrar office
- Excel upload
- Manual single-student form
