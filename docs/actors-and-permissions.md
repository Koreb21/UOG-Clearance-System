# Actors and Permissions

## Access Model

Authorization is based on:

- role
- campus
- ownership

Every protected action must pass both role validation and campus validation.

## Roles

The system has 8 actors:

- Student
- Librarian
- Proctor
- Cafe Staff
- Department Head
- Student Dean
- Finance Officer
- Main Registrar

System Administrator remains a super-user platform operator and is modeled as an administrative role with global privileges.

## 1. Student

Purpose:
Initiates and tracks their own clearance.

Permissions:

- View own profile
- Update allowed personal profile fields
- Initiate a clearance request
- View own clearance progress
- View liabilities attached to own account
- Pay eligible liabilities
- Submit status inquiries
- Download final QR certificate once cleared

Restrictions:

- Cannot register own account
- Cannot view other students
- Cannot approve, reject, or close departmental checks

## 2. Librarian

Purpose:
Audits library obligations.

Permissions:

- View students in same campus
- Create, update, and clear library liabilities
- Approve or flag the library clearance step
- Respond to student inquiries related to library issues

Restrictions:

- Cannot approve other departments
- Cannot act on students from other campuses

## 3. Proctor

Purpose:
Audits dormitory or residential obligations.

Permissions:

- View students in same campus
- Create and manage proctor liabilities
- Approve or flag the proctor clearance step
- Add comments on room or property issues

Restrictions:

- Cannot approve other departments
- Cannot act on students from other campuses

## 4. Cafe Staff

Purpose:
Audits cafeteria-related obligations.

Permissions:

- View students in same campus
- Create and manage cafe liabilities
- Approve or flag the cafe clearance step

Restrictions:

- Cannot approve other departments
- Cannot act on students from other campuses

## 5. Department Head

Purpose:
Approves pass or fail based on academic result for the relevant academic year.

Permissions:

- View students in same campus and assigned academic department
- Mark academic review as pass or fail
- Add academic result comments

Restrictions:

- Cannot approve other departments outside assigned scope
- Cannot act across campuses

## 6. Student Dean

Purpose:
Checks student behavior and disciplinary standing.

Permissions:

- View students in same campus
- Mark conduct review as cleared or flagged
- Add disciplinary comments or reasons

Restrictions:

- Cannot act across campuses

## 7. Finance Officer

Purpose:
Reconciles money-related items.

Permissions:

- View students in same campus
- View payment transactions
- Verify Chapa payment results
- Record manual bank-slip payments
- Approve or hold finance status
- Generate campus revenue reports

Restrictions:

- Cannot act across campuses unless explicitly granted central finance authority

## 8. Main Registrar

Purpose:
Final validator and file closer.

Permissions:

- View students in same campus
- View all department statuses for the campus
- Verify QR payload and status summary
- Close the clearance request when all required steps are cleared

Restrictions:

- Cannot close a file if any required step is pending, flagged, or unpaid

## 9. System Administrator

Purpose:
Super user and system operator.

Permissions:

- Create, update, deactivate, and reset accounts
- Register students in bulk or individually
- Manage campuses, departments, and configuration
- View system-wide dashboards
- View audit logs
- Monitor backend health and integration status

Restrictions:

- Sensitive actions should require strong auditing and optional two-step confirmation later

## Permission Matrix Summary

| Action | Student | Staff Dept Roles | Finance | Registrar | Sys Admin |
|---|---|---|---|---|---|
| Login | Yes | Yes | Yes | Yes | Yes |
| Self-register | No | No | No | No | No |
| Student creation | No | No | No | No | Yes |
| View own status | Yes | No | No | No | Yes |
| View campus students | No | Yes | Yes | Yes | Yes |
| Create liability | No | Yes | Yes | No | Yes |
| Approve department step | No | Yes | Yes | No | Yes |
| Close final clearance | No | No | No | Yes | Yes |
| Verify payment | No | No | Yes | No | Yes |
| Manage users | No | No | No | No | Yes |
