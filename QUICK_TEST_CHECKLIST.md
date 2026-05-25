# Quick Testing Checklist - Staff Login & Password Reset

## ✅ What Works Now

### Staff Login
- [x] Users can select campus
- [x] Users can login with ID/email and password
- [x] Staff users are automatically redirected to `/campus/:slug/staff`
- [x] Staff dashboards load with role-specific configuration
- [x] All 5 staff roles supported (Librarian, Proctor, Cafe Staff, Department Head, Student Dean)

### Forget Password - Professional 3-Step Flow

#### Step 1: Email ✅
- [x] "Forgot?" button on login page opens modal
- [x] User enters email
- [x] Verification code sent via email
- [x] Success message shows email
- [x] Professional modal with progress indicator

#### Step 2: Verify Code ✅ (NEW - Previously Missing)
- [x] Backend endpoint `/auth/verify-reset-code` added
- [x] User enters 6-digit code from email
- [x] Code validated against database
- [x] Code must not be expired (10 min TTL)
- [x] Code must not be already used
- [x] "Resend Code" button with 60-second countdown
- [x] Better error messages with icons

#### Step 3: Reset Password ✅
- [x] User sets new password
- [x] Confirmation password required
- [x] Password must be at least 6 characters
- [x] Passwords must match
- [x] New password is hashed and stored
- [x] Code marked as used
- [x] Success message and redirect to login

---

## Quick Start Testing

### 1. Start the Application
```bash
# Terminal 1: MongoDB
npm run dev:mongo

# Terminal 2: Backend
npm run dev:backend

# Terminal 3: Web frontend
cd web && npm run dev
```

### 2. Test Staff Login (in new private/incognito window)
1. Go to http://localhost:5173/login
2. Select Campus (Alpha, Beta, or Gamma)
3. Enter staff credentials
4. Click "Access Clearance Dashboard"
5. **You should see the Staff Workbench with your role**

### 3. Test Password Reset
1. Go to http://localhost:5173/login
2. Click "Forgot?" button
3. Enter your email
4. Check email for 6-digit code (or check backend logs)
5. Enter code
6. Enter new password (min 6 chars)
7. Click "Reset Password"
8. **You should be logged out and see login page**
9. Login with new password

---

## Visual Improvements Made

### Before (Original Modal)
```
┌─────────────────────────┐
│ Reset Password         │
│ Step 1 of 3             │
├─────────────────────────┤
│ Email Address           │
│ [____________]          │
│ Send Code               │
└─────────────────────────┘
```

### After (Enhanced Modal)
```
┌──────────────────────────────────────────┐
│ 🔒 Reset Your Password                   │
│  1️⃣ 2️⃣ 3️⃣  (Progress bars)               │
├──────────────────────────────────────────┤
│ ✅ Code verified successfully            │
│ ⚠️  Invalid verification code            │
├──────────────────────────────────────────┤
│ Email Address                            │
│ [✉️ you@university.edu             ]    │
│ Send Verification Code                   │
├──────────────────────────────────────────┤
│ Resend Code (60s) │ Back                │
└──────────────────────────────────────────┘
```

### Features Added
✨ Visual progress bar showing step (1/2/3)  
✨ Icons for better visual hierarchy  
✨ Resend code button with countdown timer  
✨ Better error/success messages with icons  
✨ Improved spacing and typography  
✨ Auto-focus on inputs for better UX  
✨ Professional gradient header  
✨ Back button navigation  
✨ Password requirements display  

---

## Test Cases

### ✅ Positive Tests (Should Succeed)
- [ ] Test 1: Valid email sends code
- [ ] Test 2: Valid code verifies successfully  
- [ ] Test 3: Password reset with valid code works
- [ ] Test 4: Can resend code
- [ ] Test 5: Can go back between steps
- [ ] Test 6: Can cancel modal
- [ ] Test 7: Matching passwords required
- [ ] Test 8: Min 6 character password required
- [ ] Test 9: Staff login works
- [ ] Test 10: Student login works

### ❌ Negative Tests (Should Show Error)
- [ ] Test 1: Invalid email shows error
- [ ] Test 2: Wrong code shows error
- [ ] Test 3: Expired code shows error (10+ min)
- [ ] Test 4: Reused code shows error
- [ ] Test 5: Mismatched passwords show error
- [ ] Test 6: Password too short shows error
- [ ] Test 7: Non-existent user shows error

---

## Files Changed

### Backend (Java)
1. **AuthController.java** - Added `/auth/verify-reset-code` endpoint
2. **PasswordResetService.java** - Added `verifyCode()` method

### Frontend (React/TypeScript)
1. **ForgotPasswordModal.tsx** - Enhanced UI with 10+ improvements

### Build Status
✅ TypeScript compilation: **PASS**  
✅ Web build: **PASS** (319KB production)  
✅ No errors or warnings  

---

## Staff Role Configuration Guide

When a staff member logs in, the system automatically loads the correct configuration based on their role:

```json
{
  "LIBRARIAN": {
    "officeName": "Library",
    "roleBadge": "Librarian",
    "heroTitle": "Library Clearance Workspace",
    "targetCheckCode": "LIBRARY"
  },
  "PROCTOR": {
    "officeName": "Proctor",
    "roleBadge": "Proctor",
    "heroTitle": "Dormitory Clearance Workspace",
    "targetCheckCode": "PROCTOR"
  },
  "CAFE_STAFF": {
    "officeName": "Cafe",
    "roleBadge": "Cafe Staff",
    "heroTitle": "Cafe Clearance Workspace",
    "targetCheckCode": "CAFE"
  },
  "DEPARTMENT_HEAD": {
    "officeName": "Academic",
    "roleBadge": "Department Head",
    "heroTitle": "Academic Clearance Workspace",
    "targetCheckCode": "DEPARTMENT_HEAD"
  },
  "STUDENT_DEAN": {
    "officeName": "Dean of Students",
    "roleBadge": "Student Dean",
    "heroTitle": "Dean of Students Workspace",
    "targetCheckCode": "STUDENT_DEAN"
  }
}
```

Each role gets:
- Custom workspace title and description
- Role-specific decision options
- Liability/item types for their office
- Department-specific queue management
- Payment verification (where applicable)

---

## Troubleshooting Commands

### Check if services are running
```bash
# Check port 8080 (backend)
netstat -ano | findstr :8080

# Check port 27017 (MongoDB)
netstat -ano | findstr :27017

# Check port 5173 (Web dev)
netstat -ano | findstr :5173
```

### View backend logs
```bash
# In the backend terminal, look for:
# - "Successfully authenticated user"
# - "Password reset code sent to"
# - "Password reset completed for"
```

### Check browser console
Press F12 and check Console tab for:
- No TypeScript errors
- API calls to /api/v1/auth/* endpoints
- Response status codes (200, 204, 400, 401)

---

## Next Steps

1. **Test the implementation** using the checklist above
2. **Review the detailed guide**: STAFF_LOGIN_AND_PASSWORD_RESET_GUIDE.md
3. **Check backend logs** for any issues
4. **Test with multiple roles** to verify staff workbench loads correctly
5. **Test password reset flow** with various scenarios

