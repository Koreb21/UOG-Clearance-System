# Staff Login & Password Reset Implementation Guide

## Overview
This document outlines the completed staff login verification and professional forget password implementation for the Clearance System.

## ✅ Completed Features

### 1. Staff Login & Dashboard

#### Staff Authentication Flow
1. User navigates to login page
2. Selects campus (TEWODROS, MARAKI, or FASIL)
3. Enters ID/Email and Password
4. System authenticates via Spring Security
5. **Automatic Role-Based Redirect**:
   - Students → `/campus/:slug/student` (Student Dashboard)
   - Staff → `/campus/:slug/staff` (Staff Workbench)
   - Registrar → `/campus/:slug/registrar` (Registrar Dashboard)
   - Finance Officer → `/campus/:slug/finance` (Finance Dashboard)
   - System Admin → `/admin` (Admin Dashboard)

#### Staff Roles Supported
The staff dashboard supports multiple role-based configurations:

1. **LIBRARIAN**
   - Office: Library
   - Functions: Review book returns, assess fines, authorize clearances
   - Decision Options: CLEARED, FLAGGED, IN_REVIEW, FAILED
   - Queue: Active queue of students

2. **PROCTOR**
   - Office: Proctor/Dormitory
   - Functions: Asset inspection, damage assessment, liability documentation
   - Decision Options: CLEARED, FLAGGED, IN_REVIEW, FAILED
   - Queue: Inspection queue

3. **CAFE_STAFF**
   - Office: Cafeteria
   - Functions: Verify meal-card and cafeteria obligations
   - Decision Options: CLEARED, FLAGGED, IN_REVIEW, FAILED
   - Queue: Verification queue

4. **DEPARTMENT_HEAD**
   - Office: Academic
   - Functions: Verify academic eligibility and program requirements
   - Decision Options: CLEARED, IN_REVIEW, FAILED
   - Queue: Department queue

5. **STUDENT_DEAN**
   - Office: Dean of Students
   - Functions: Student life and affairs clearance
   - Decision Options: CLEARED, IN_REVIEW, FAILED
   - Queue: Dean's queue

#### Staff Dashboard Features
- **Stats Display**: Pending reviews, campus roster, finance flags
- **Student Queue Management**: View and manage pending clearances
- **Liability Management**: Create and track student liabilities
- **Decision Making**: Submit clearance decisions with notes
- **Inquiry Handling**: Respond to student inquiries
- **Payment Verification**: Verify student payment status
- **Activity Tracking**: View audit trail of actions

---

### 2. Professional Password Reset Implementation

#### Architecture
The password reset feature uses a **secure 3-step email verification flow**:

**Step 1: Email Verification**
- User enters email address
- System sends 6-digit verification code (expires in 10 minutes)
- Code is stored with bcrypt hashing
- Email includes instructions and code

**Step 2: Code Verification** (NEW)
- User enters 6-digit code from email
- System validates:
  - Code exists in database
  - Code hasn't been used before
  - Code hasn't expired
  - Code matches hash
- No password change at this step (security checkpoint)

**Step 3: Password Reset**
- User sets new password
- System requires: min 6 characters, confirmed match
- Password is hashed with bcrypt
- Code is marked as used
- User is logged out and redirected to login

#### New Backend Endpoint
```
POST /api/v1/auth/verify-reset-code
{
  "email": "user@university.edu",
  "code": "123456"
}
```

**Response**: 
- Success (204 No Content) - Code verified, proceed to password step
- Error (400/401) - Invalid email, code, or code expired

#### Security Features
✅ **Time-Limited Codes**: 10-minute expiration  
✅ **One-Time Use**: Codes can only be used once  
✅ **Bcrypt Hashing**: Codes never stored in plain text  
✅ **Campus Validation**: Supports campus-specific password resets  
✅ **Dual Lookup**: Supports both user and student accounts  

---

### 3. Enhanced UI/UX for Forget Password

#### Professional Features
- **Visual Progress Bar**: Shows user's position in 3-step process
- **Icons & Badges**: Lock, envelope, checkmark, alert icons
- **Resend Functionality**: 
  - "Resend Code" button with 60-second countdown
  - Prevents spam while allowing legitimate resends
- **Clear Status Messages**:
  - Success messages with green checkmarks
  - Error messages with red alerts
  - Step completion indicators
- **Better Styling**:
  - Gradient header with teal theme
  - Responsive modal design
  - Improved button states and transitions
  - Password strength requirements displayed
- **Auto-focus**: Inputs automatically focus for better UX
- **Back Navigation**: Users can go back to previous steps

---

## Testing Instructions

### 1. Test Staff Login

#### Prerequisites
- Backend running on port 8080 (`npm run dev:backend` or `mvn spring-boot:run`)
- MongoDB running on port 27017 (`npm run dev:mongo`)
- Web dev server running on port 5173 (`npm run dev`)

#### Test Steps
1. Open `http://localhost:5173/login`
2. Click on a campus (e.g., "Campus Alpha")
3. Enter staff credentials:
   - **Username**: Staff ID or email
   - **Password**: Your password
4. Click "Access Clearance Dashboard"
5. **Expected**: Redirect to `/campus/alpha/staff` with staff workbench
6. **Verify**: 
   - Correct role badge displays (Librarian, Proctor, etc.)
   - Queue items load
   - Staff can interact with students in queue

### 2. Test Password Reset Flow

#### Test Scenario A: Complete Flow
1. Click "Forgot?" on login page
2. Enter email and click "Send Verification Code"
3. **Verify**: Success message shows email
4. Enter 6-digit code from email (check logs or mock)
5. Click "Verify Code"
6. **Verify**: "Code verified" message
7. Enter new password (min 6 chars)
8. Confirm password
9. Click "Reset Password"
10. **Verify**: Success message, redirect to login

#### Test Scenario B: Resend Code
1. Start password reset
2. Send code to email
3. Wait 10 seconds
4. Click "Resend Code" button
5. **Verify**: Countdown starts from 60 seconds
6. **Verify**: New code sent to email

#### Test Scenario C: Invalid Code
1. Start password reset
2. Send code
3. Enter wrong code (e.g., "000000")
4. Click "Verify Code"
5. **Verify**: Error message "Invalid or expired verification code"

#### Test Scenario D: Expired Code
1. Start password reset
2. Wait 10+ minutes
3. Try to verify code
4. **Verify**: Error message "Verification code expired. Request a new code."

#### Test Scenario E: Code Reuse Prevention
1. Start password reset
2. Send code and verify it
3. Complete password reset
4. Start new reset and try to reuse old code
5. **Verify**: Error "This verification code has already been used"

### 3. Test Campus-Specific Password Reset
1. Start password reset with email from TEWODROS campus
2. Select MARAKI campus during login
3. **Verify**: Error message about campus mismatch (if implemented)

---

## Implementation Details

### Files Modified

#### Backend
1. **[AuthController.java](backend/src/main/java/com/uog/clearance/auth/controller/AuthController.java)**
   - Added: `@PostMapping("/verify-reset-code")`
   - Calls: `passwordResetService.verifyCode()`

2. **[PasswordResetService.java](backend/src/main/java/com/uog/clearance/auth/service/PasswordResetService.java)**
   - Added: `verifyCode(String email, String code)` method
   - Validates code without changing password

#### Frontend
1. **[ForgotPasswordModal.tsx](web/src/modules/auth/ForgotPasswordModal.tsx)**
   - Enhanced UI with progress bar
   - Added resend code functionality
   - Improved error/success messages
   - Professional styling and icons
   - Auto-focus on inputs

2. **[LoginPage.tsx](web/src/pages/LoginPage.tsx)**
   - No changes (already integrated)
   - Calls `setShowForgotPasswordModal(true)` on "Forgot?" click

---

## API Endpoints Reference

```
POST /api/v1/auth/login
- Request: { username, password, expectedCampusId? }
- Response: { accessToken, tokenType, userId, username, role, campusId, mustChangePassword }

GET /api/v1/auth/me
- Request: Bearer token in header
- Response: { id, username, role, campusId, departmentId, studentId }

POST /api/v1/auth/request-password-reset
- Request: { email, expectedCampusId? }
- Response: 204 No Content
- Side Effect: Sends verification code via email

POST /api/v1/auth/verify-reset-code ✨ NEW
- Request: { email, code }
- Response: 204 No Content
- Side Effect: Validates code (doesn't change password)

POST /api/v1/auth/reset-password-complete
- Request: { email, code, newPassword }
- Response: 204 No Content
- Side Effect: Changes password, marks code as used

POST /api/v1/auth/change-password
- Request: Bearer token, { currentPassword, newPassword }
- Response: 204 No Content
```

---

## Security Checklist

✅ Staff login uses Spring Security authentication  
✅ Password reset codes are bcrypt hashed  
✅ Codes expire after 10 minutes  
✅ Codes can only be used once  
✅ Email verification prevents unauthorized password changes  
✅ Campus validation prevents cross-campus attacks  
✅ Bearer token required for authenticated endpoints  
✅ All passwords meet minimum length requirement  
✅ Passwords must be confirmed before reset  

---

## Troubleshooting

### Issue: "Cannot reach the clearance API"
**Solution**: Start backend with `npm run dev:backend` on port 8080

### Issue: "MongoDB connection failed"
**Solution**: Start MongoDB with `npm run dev:mongo` on port 27017

### Issue: Staff sees wrong dashboard
**Solution**: Check user role in database - must be one of: LIBRARIAN, PROCTOR, CAFE_STAFF, DEPARTMENT_HEAD, STUDENT_DEAN

### Issue: Email not received
**Solution**: 
- Check backend email configuration in `application.yml`
- Check spam folder
- Check backend logs for email sending errors

### Issue: Verification code invalid
**Solution**:
- Code is 6 digits only (no spaces or dashes)
- Code expires after 10 minutes
- Each email only has one active code at a time
- Previous codes are invalidated when new code is sent

---

## Future Enhancements

Potential improvements for future versions:

1. **SMS Verification**: Add SMS code delivery option
2. **Two-Factor Authentication**: Require 2FA for sensitive operations
3. **Password History**: Prevent reuse of recent passwords
4. **Biometric Login**: Support fingerprint/face recognition
5. **Session Management**: View active sessions, remote logout
6. **Security Log**: Audit trail of login attempts, password changes
7. **Password Strength Meter**: Real-time password complexity feedback
8. **Account Lockout**: Temporary lock after failed attempts

---

## Questions or Issues?

For questions about staff login or password reset functionality:
1. Check this guide first
2. Review backend logs: `npm run dev:backend`
3. Check browser console for frontend errors
4. Verify database connectivity and data

