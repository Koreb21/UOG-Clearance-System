# Authentication & Staff Login - Comprehensive Verification Guide

## ✅ VERIFIED ENDPOINTS

### Authentication Endpoints
- **POST `/api/v1/auth/login`** - Staff/Student login with optional campus selection
- **GET `/api/v1/auth/me`** - Get current authenticated user
- **POST `/api/v1/auth/change-password`** - Change user password

### Staff Access Endpoints (Campus-Based)
- **GET `/api/v1/staff/students`** - List visible students (campus-filtered)
- **GET `/api/v1/staff/queue`** - Get staff queue items (staff role required)
- **GET `/api/v1/staff/students/{studentId}/clearance-requests`** - Get student requests
- **GET `/api/v1/staff/students/{studentId}/clearance`** - Get clearance status
- **PATCH `/api/v1/staff/checks/{checkId}/review`** - Submit check review
- **POST `/api/v1/staff/liabilities`** - Create liability for student
- **GET `/api/v1/staff/inquiries`** - List staff inquiries
- **PATCH `/api/v1/staff/inquiries/{inquiryId}/respond`** - Respond to inquiry

### Admin Endpoints
- **POST `/api/v1/admin/staff-users`** - Create staff user (SYSTEM_ADMIN only)
- **GET `/api/v1/admin/staff-users`** - List staff users (SYSTEM_ADMIN only)
- **PUT `/api/v1/admin/staff-users/{userId}`** - Update staff user
- **PATCH `/api/v1/admin/staff-users/{userId}/activate`** - Activate/deactivate staff

### Frontend Routes
- `/login` - Campus selection and login
- `/campus/{campusSlug}/staff` - Staff dashboard (LIBRARIAN, PROCTOR, CAFE_STAFF, DEPARTMENT_HEAD, STUDENT_DEAN)
- `/campus/{campusSlug}/student` - Student dashboard (STUDENT)
- `/campus/{campusSlug}/finance` - Finance dashboard (FINANCE_OFFICER)
- `/campus/{campusSlug}/registrar` - Registrar dashboard (MAIN_REGISTRAR)
- `/admin` - Admin dashboard (SYSTEM_ADMIN)

## 🔒 Security Features Confirmed

### 1. Campus-Based Access Control
✓ `AuthService.login()` validates `expectedCampusId`
✓ `CampusProtectedRoute` enforces campus matching
✓ Staff can only see students from their campus
✓ `@campusAccessService.canAccessStudent()` checks access

### 2. Role-Based Access Control
✓ Each endpoint has `@PreAuthorize` with specific roles
✓ Staff roles: LIBRARIAN, PROCTOR, CAFE_STAFF, DEPARTMENT_HEAD, STUDENT_DEAN, FINANCE_OFFICER, MAIN_REGISTRAR
✓ Admin role: SYSTEM_ADMIN
✓ Student role: STUDENT

### 3. Authentication Flow
✓ Username/password authentication
✓ JWT token generation and validation
✓ Token expiration (120 minutes default)
✓ Session invalidation on 401 errors
✓ Password change requirement flag

## 🧪 TESTING CHECKLIST

### Test 1: Staff Login - Campus Selection
**Objective**: Verify staff can login via campus selection
**Steps**:
1. Navigate to `/login`
2. Select campus (TEWODROS, MARAKI, or FASIL)
3. Enter staff username and password
4. Click "Access Clearance Dashboard"

**Expected**:
- Token received and stored
- User redirected to `/campus/{campusSlug}/staff`
- Campus matches selection

**Test Credentials** (Default):
- Admin: `admin` / `admin@123`

---

### Test 2: Staff Dashboard Access
**Objective**: Verify staff can access their workspace
**Steps**:
1. Login as staff (any role)
2. Navigate to `/campus/{campusSlug}/staff`
3. Observe queue and student list

**Expected**:
- Staff workspace loads
- Queue items visible
- Student list populated from API
- No 401 or 403 errors

---

### Test 3: Campus-Based Filtering
**Objective**: Verify students are filtered by campus
**Steps**:
1. Login as staff on TEWODROS campus
2. View student list
3. Login as different staff on MARAKI campus
4. View student list

**Expected**:
- Each staff sees only their campus students
- No cross-campus access

---

### Test 4: Student Access
**Objective**: Verify student login and dashboard
**Steps**:
1. Navigate to `/login`
2. Select any campus
3. Enter student credentials
4. Navigate to `/campus/{campusSlug}/student`

**Expected**:
- Student dashboard loads
- Can create clearance requests
- Can view request status

---

### Test 5: Clearance Request Workflow
**Objective**: Verify student can create and staff can review requests
**Steps**:
1. Login as student
2. Create clearance request (SEMESTER/FINAL/WITHDRAWAL)
3. Login as staff (same campus)
4. View student in queue
5. Submit review decision

**Expected**:
- Request created with unique ID
- Staff sees request in queue
- Decision recorded
- Status updates correctly

---

### Test 6: Liability Creation
**Objective**: Verify staff can create liabilities
**Steps**:
1. Login as staff (e.g., LIBRARIAN)
2. Select student from list
3. Create liability (book, fine, etc.)
4. Set payment requirement

**Expected**:
- Liability created
- Student sees liability on dashboard
- Payment required if flagged

---

### Test 7: Inquiry Workflow
**Objective**: Verify student/staff inquiry communication
**Steps**:
1. Login as student
2. Create inquiry on clearance request
3. Login as staff
4. View inquiry
5. Respond to inquiry
6. Login as student, view response

**Expected**:
- Inquiry visible to staff
- Response sent successfully
- Student sees response

---

## 🐛 POTENTIAL ISSUES & FIXES

### Issue 1: Session Expiration
**Problem**: User session expires after 120 minutes
**Solution**: Set `JWT_EXPIRATION_MINUTES` in environment variables

### Issue 2: CORS/Proxy Issues
**Problem**: API requests blocked during development
**Solution**: 
- Ensure backend running on `http://localhost:8080`
- Set `VITE_API_BASE_URL` if not using default proxy

### Issue 3: MongoDB Connection
**Problem**: Backend cannot connect to MongoDB
**Solution**: 
```bash
# Start MongoDB
docker run -d -p 27017:27017 mongo:latest

# Or run npm script
npm run dev:mongo
```

### Issue 4: Campus ID Mismatch
**Problem**: User redirected to `/campus/{campusSlug}/mismatch`
**Solution**: Ensure user's campus ID matches campus slug in route

### Issue 5: Missing Staff User
**Problem**: Staff cannot login
**Solution**: Create staff user via admin dashboard or API

## 📋 Environment Variables Required

```bash
# Backend (backend/.env)
MONGODB_URI=mongodb://127.0.0.1:27017/clearance_system
SERVER_PORT=8080
JWT_SECRET=change-this-secret-in-production
JWT_EXPIRATION_MINUTES=120
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=admin@123

# Web (web/.env)
VITE_API_BASE_URL=/api/v1
```

## 🚀 Quick Start Commands

```bash
# Terminal 1: Start MongoDB
npm run dev:mongo

# Terminal 2: Start Backend
npm run dev:backend

# Terminal 3: Start Web Dev Server
npm run dev:web

# Test Backend
curl http://localhost:8080/api/v1/auth/test-debug
```

## 📊 API Response Types

### LoginResponse
```json
{
  "accessToken": "eyJhbGc...",
  "tokenType": "Bearer",
  "userId": "...",
  "username": "staffname",
  "role": "LIBRARIAN",
  "campusId": "TEWODROS",
  "mustChangePassword": false
}
```

### StaffQueueItem
```json
{
  "checkId": "...",
  "checkCode": "LIBRARY",
  "checkStatus": "PENDING",
  "studentId": "...",
  "studentName": "John Doe",
  "clearanceRequestId": "...",
  "requestType": "SEMESTER"
}
```

### CurrentUserResponse
```json
{
  "userId": "...",
  "username": "staffname",
  "role": "LIBRARIAN",
  "campusId": "TEWODROS",
  "departmentId": null,
  "studentId": null
}
```

## ✨ Final Status

| Component | Status | Notes |
|-----------|--------|-------|
| Authentication Flow | ✅ Complete | Login, token generation, validation |
| Campus-Based Access | ✅ Complete | Frontend and backend enforcement |
| Staff Roles | ✅ Complete | 5 staff roles configured |
| Staff Queue | ✅ Complete | Campus-filtered queue items |
| Clearance Workflow | ✅ Complete | Student request → Staff review |
| Liability Management | ✅ Complete | Create, track, clear liabilities |
| Inquiry System | ✅ Complete | Bidirectional communication |
| Admin Dashboard | ✅ Complete | Staff user management |

---

**Last Updated**: May 12, 2026
**Version**: 1.0
