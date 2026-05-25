# University of Gondar Clearance System - Visual Guide

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEB APPLICATION (React)                      │
│                      localhost:3000                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Login Page  │  │  Campus      │  │  Protected   │          │
│  │              │  │  Selection   │  │  Routes      │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                        │
│  ┌──────▼──────────────────────────────────────────────┐        │
│  │  Auth Context                                       │        │
│  │  - Token storage                                    │        │
│  │  - User state                                       │        │
│  │  - Campus validation                               │        │
│  └──────┬───────────────────────────────────────────────┘        │
│         │                                                        │
│  ┌──────▼──────────────────────────────────────────────┐        │
│  │  Dashboards                                         │        │
│  │  ┌─────────────┐  ┌────────────────┐  ┌─────────┐  │        │
│  │  │   Student   │  │     Staff      │  │  Admin  │  │        │
│  │  │  Dashboard  │  │   Dashboard    │  │ Dashboard  │        │
│  │  └─────────────┘  └────────────────┘  └─────────┘  │        │
│  └──────────────────────────────────────────────────────┘        │
│         │                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │ Bearer Token
          │ (JWT)
          │
┌─────────▼────────────────────────────────────────────────────────┐
│              BACKEND API (Spring Boot)                           │
│                 localhost:8080                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Auth Controller                                        │   │
│  │  POST   /auth/login                                     │   │
│  │  GET    /auth/me                                        │   │
│  │  POST   /auth/change-password                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Staff Controllers                                      │   │
│  │  GET    /staff/students                                 │   │
│  │  GET    /staff/queue                                    │   │
│  │  PATCH  /staff/checks/{id}/review                       │   │
│  │  POST   /staff/liabilities                              │   │
│  │  GET    /staff/inquiries                                │   │
│  │  PATCH  /staff/inquiries/{id}/respond                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Admin Controllers                                      │   │
│  │  GET    /admin/staff-users                              │   │
│  │  POST   /admin/staff-users                              │   │
│  │  PUT    /admin/staff-users/{id}                         │   │
│  │  GET    /admin/students                                 │   │
│  │  POST   /admin/students                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │
          │
┌─────────▼────────────────────────────────────────────────────────┐
│              MONGODB Database                                    │
│                 localhost:27017                                  │
├─────────────────────────────────────────────────────────────────┤
│  Collections:                                                    │
│  - users (admin, staff, students)                               │
│  - campuses (TEWODROS, MARAKI, FASIL)                          │
│  - departments (academic, clearance)                            │
│  - clearance_requests                                           │
│  - clearance_checks                                             │
│  - liabilities                                                  │
│  - inquiries                                                    │
│  - payments                                                     │
│  - audit_logs                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Authentication Flow

```
User Login
    │
    ▼
┌──────────────────────────────┐
│ 1. Campus Selection          │
│    - Choose TEWODROS/MARAKI  │
│    - Or FASIL                │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 2. Submit Credentials        │
│    - Username/Password       │
│    - Expected Campus ID      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 3. Backend Validation        │
│    - Check user exists       │
│    - Verify password         │
│    - Validate campus match   │
└──────────┬───────────────────┘
           │
           ├─── FAIL ─────► 401 Error
           │
           ▼
┌──────────────────────────────┐
│ 4. Generate JWT Token        │
│    - User ID in payload      │
│    - Role (LIBRARIAN, etc.)  │
│    - Campus ID               │
│    - 120-min expiration      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 5. Return Response           │
│    {                         │
│      accessToken: "...",     │
│      role: "LIBRARIAN",      │
│      campusId: "TEWODROS"    │
│    }                         │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ 6. Frontend Storage          │
│    - Save token to localStorage
│    - Set user in context     │
│    - Redirect to dashboard   │
└──────────────────────────────┘
```

---

## 👥 Role Hierarchy & Access

```
                    SYSTEM_ADMIN
                         │
            ┌────────────┬┴────────────┬──────────────┐
            │            │            │              │
        Admin    Campus Admin    Campus User    Student
        Panel        Panel          Portal      Portal
            │            │            │              │
            ▼            ▼            ▼              ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐  ┌──────────┐
      │ Manage   │ │Manage    │ │ Clear    │  │ Create   │
      │ All      │ │Staff for │ │ Requests │  │ Request  │
      │ Users    │ │Campus    │ │ + Pay    │  │          │
      └──────────┘ └──────────┘ └──────────┘  └──────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
              LIBRARIAN          PROCTOR          CAFE_STAFF
              (Library)          (Dorm)           (Cafe)
                    │                 │                 │
                    ▼                 ▼                 ▼
              ┌──────────┐      ┌──────────┐     ┌──────────┐
              │Review    │      │Asset     │     │Verify    │
              │Books &   │      │Inspection│     │Meal Card │
              │Fines     │      │Damage    │     │Debt      │
              └──────────┘      └──────────┘     └──────────┘
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
              DEPARTMENT_HEAD    STUDENT_DEAN    FINANCE_OFFICER
              (Academic)         (Affairs)       (Payments)
                    │                 │                 │
                    ▼                 ▼                 ▼
              ┌──────────┐      ┌──────────┐     ┌──────────┐
              │Verify    │      │Verify    │     │Record    │
              │Academic  │      │Student   │     │Payments  │
              │Status    │      │Status    │     │Fines     │
              └──────────┘      └──────────┘     └──────────┘
                                                        │
                                                        ▼
                                                  MAIN_REGISTRAR
                                                  (Registrar)
                                                        │
                                                        ▼
                                                  ┌──────────┐
                                                  │Generate  │
                                                  │Cert &    │
                                                  │Close Req │
                                                  └──────────┘
```

---

## 🏛️ Campus System

```
UNIVERSITY OF GONDAR
│
├─ TEWODROS CAMPUS
│  ├─ Staff:
│  │  ├─ Librarian
│  │  ├─ Proctor
│  │  ├─ Cafe Staff
│  │  ├─ Department Head
│  │  └─ Student Dean
│  ├─ Students: 200+ (TEWODROS only)
│  └─ Queue: Isolated to campus
│
├─ MARAKI CAMPUS
│  ├─ Staff:
│  │  ├─ Librarian
│  │  ├─ Proctor
│  │  ├─ Cafe Staff
│  │  ├─ Department Head
│  │  └─ Student Dean
│  ├─ Students: 150+ (MARAKI only)
│  └─ Queue: Isolated to campus
│
├─ FASIL CAMPUS
│  ├─ Staff:
│  │  ├─ Finance Officer
│  │  ├─ Main Registrar
│  │  └─ System Admin
│  ├─ Students: Central campus
│  └─ Queue: Central management
│
└─ Central Admin
   └─ System Admin (manage all)
```

---

## 📋 Clearance Workflow Timeline

```
┌─────────────────────────────────────────────────────────────┐
│ STUDENT PHASE                                               │
├─────────────────────────────────────────────────────────────┤
│
│  Day 1: Create Request
│  │
│  ├─ Student logs in
│  ├─ Creates clearance request (SEMESTER/FINAL)
│  ├─ Submits with signature
│  │
│  Status: PENDING
│
└─────────────────────────────────────────────────────────────┘
         │
         │ Staff Assigned
         ▼
┌─────────────────────────────────────────────────────────────┐
│ STAFF REVIEW PHASE                                          │
├─────────────────────────────────────────────────────────────┤
│
│  Day 2-3: Staff Review
│  │
│  ├─ LIBRARIAN reviews books
│  │  ├─ If fine due: Create liability
│  │  └─ Submit decision (CLEARED/FLAGGED)
│  │
│  ├─ PROCTOR reviews dorm
│  │  ├─ If damage: Create liability
│  │  └─ Submit decision
│  │
│  ├─ CAFE_STAFF reviews meals
│  │  ├─ If debt: Create liability
│  │  └─ Submit decision
│  │
│  ├─ DEPARTMENT_HEAD reviews academics
│  │  ├─ If grade issue: Flag request
│  │  └─ Submit decision
│  │
│  ├─ STUDENT_DEAN reviews affairs
│  │  ├─ If disciplinary: Flag request
│  │  └─ Submit decision
│  │
│  Status: IN_REVIEW → AWAITING_FINANCE (if payment needed)
│
└─────────────────────────────────────────────────────────────┘
         │
         │ Liabilities Created
         ▼
┌─────────────────────────────────────────────────────────────┐
│ PAYMENT PHASE                                               │
├─────────────────────────────────────────────────────────────┤
│
│  Day 4-5: Payment
│  │
│  ├─ Student views liabilities
│  ├─ Pays via Chapa (online payment)
│  │  - Library fine: 100 ETB
│  │  - Dorm damage: 500 ETB
│  │  - Cafe debt: 50 ETB
│  │
│  ├─ Payment recorded by FINANCE_OFFICER
│  │
│  Status: PAID_PENDING_DEPARTMENT_APPROVAL
│
└─────────────────────────────────────────────────────────────┘
         │
         │ Payment Cleared
         ▼
┌─────────────────────────────────────────────────────────────┐
│ FINAL PHASE                                                 │
├─────────────────────────────────────────────────────────────┤
│
│  Day 6: Finalization
│  │
│  ├─ MAIN_REGISTRAR reviews all clearances
│  ├─ All checks CLEARED ✓
│  │
│  ├─ Generates certificate with QR code
│  ├─ Closes request
│  │
│  Status: CLEARED
│
│  Student can now:
│  - Graduate
│  - Receive diploma
│  - Access clearance certificate
│
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Features

```
FRONTEND SECURITY
├─ JWT Token Storage (localStorage)
├─ Authorization Header (Bearer token)
├─ Route Protection (CampusProtectedRoute)
├─ Campus Validation (CampusProtectedRoute)
├─ Session Invalidation (401 handling)
└─ Secure Logout (token cleared)

BACKEND SECURITY
├─ Password Hashing (BCrypt)
├─ JWT Token Validation
├─ @PreAuthorize Role Checking
├─ @campusAccessService Campus Checking
├─ 401/403 Error Handling
├─ Audit Logging (all actions)
├─ Parameter Validation
└─ SQL Injection Prevention

DATABASE SECURITY
├─ MongoDB User Authentication
├─ Encrypted Passwords
├─ Audit Trail
├─ Data Validation
└─ Index Optimization
```

---

## 📊 Data Models

### User
```json
{
  "_id": "ObjectId",
  "username": "librarian1",
  "passwordHash": "bcrypt hash",
  "role": "LIBRARIAN",
  "campusId": "TEWODROS",
  "departmentId": "LIBRARY_DEPT",
  "active": true,
  "mustChangePassword": false,
  "createdAt": "2024-01-01T10:00:00Z"
}
```

### ClearanceRequest
```json
{
  "_id": "ObjectId",
  "studentId": "UG001",
  "campusId": "TEWODROS",
  "semester": "SPRING_2024",
  "academicYearLabel": "2023-2024",
  "requestType": "SEMESTER",
  "status": "IN_REVIEW",
  "checks": [
    {
      "_id": "check1",
      "checkCode": "LIBRARY",
      "status": "PENDING",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ],
  "submittedAt": "2024-01-01T10:00:00Z"
}
```

### Liability
```json
{
  "_id": "ObjectId",
  "studentId": "UG001",
  "clearanceRequestId": "req123",
  "checkCode": "LIBRARY",
  "itemName": "Unknown Book",
  "category": "Lost Book",
  "amount": 100,
  "paymentRequired": true,
  "status": "PENDING",
  "createdAt": "2024-01-02T10:00:00Z"
}
```

---

## 🎯 Testing Checklist (Quick Version)

### ✅ Pre-Testing
- [ ] Start MongoDB: `npm run dev:mongo`
- [ ] Start Backend: `npm run dev:backend`
- [ ] Start Web: `npm run dev:web`

### ✅ Admin Test
- [ ] Navigate to `http://localhost:3000`
- [ ] Tap logo 5 times
- [ ] Login as `admin` / `admin@123`
- [ ] See admin dashboard

### ✅ Staff Test
- [ ] Create LIBRARIAN user via admin
- [ ] Logout
- [ ] Go to login page
- [ ] Select TEWODROS campus
- [ ] Login as new staff user
- [ ] See staff dashboard with queue

### ✅ Student Test
- [ ] Create student account via admin
- [ ] Logout
- [ ] Select any campus
- [ ] Login as student
- [ ] Create clearance request
- [ ] See request in student list

### ✅ Workflow Test
- [ ] Login as staff (same campus as student)
- [ ] See student in list
- [ ] Create liability
- [ ] Submit decision
- [ ] See updates on student dashboard

---

## 🚀 Quick Start Commands

```bash
# Start all services (Mac/Linux)
npm run dev:mongo &
npm run dev:backend &
npm run dev:web &

# Test everything
test-auth.ps1  # Windows
bash test-auth.sh  # Mac/Linux

# Access points
http://localhost:3000    # Frontend
http://localhost:8080    # Backend API
localhost:27017          # MongoDB

# Default login
admin / admin@123
```

---

**Visual Guide Version**: 1.0  
**Last Updated**: May 12, 2026  
**Clarity**: Easy to understand for developers
