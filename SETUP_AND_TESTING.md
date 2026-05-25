# Staff Login & Authentication - Complete Testing Guide

## 🎯 Project Overview

This clearance system includes:
- **Student Portal**: Create and track clearance requests
- **Staff Portal**: Review requests by role (Librarian, Proctor, Cafe Staff, Department Head, Student Dean)
- **Finance Portal**: Manage payments and financial holds
- **Registrar Portal**: Generate certificates and finalize clearances
- **Admin Portal**: Manage users, campuses, and departments

## ✅ What Has Been Verified

### Authentication System ✓
- Admin and staff login with JWT tokens
- Campus-based access control
- Role-based authorization for 9 different roles
- Password change requirement flag
- Session management with 120-minute token expiration

### Staff Roles & Access ✓
1. **LIBRARIAN** - Library clearance workspace
2. **PROCTOR** - Dorm/dormitory clearance workspace
3. **CAFE_STAFF** - Cafeteria clearance workspace
4. **DEPARTMENT_HEAD** - Academic clearance workspace
5. **STUDENT_DEAN** - Student affairs clearance workspace
6. **FINANCE_OFFICER** - Finance dashboard (payments, records)
7. **MAIN_REGISTRAR** - Registrar dashboard (certificates, QR)
8. **SYSTEM_ADMIN** - Admin dashboard (user management)

### Campus System ✓
- Three campuses: TEWODROS, MARAKI, FASIL
- Staff filtered by campus
- Students filtered by campus
- Campus mismatch detection and routing

### Clearance Workflow ✓
1. **Student**: Create request (SEMESTER/FINAL/WITHDRAWAL)
2. **Staff**: Review request in queue
3. **Staff**: Create liabilities (fines, fees)
4. **Student**: View liabilities and pay via Chapa
5. **Finance**: Record payments
6. **Staff**: Clear liabilities after payment
7. **Registrar**: Generate certificate
8. **Registrar**: Close request

### Inquiry System ✓
- Students can create inquiries on requests
- Staff can view and respond to inquiries
- Bidirectional communication

## 🚀 Setup & Running the Application

### Prerequisites
- Node.js (v16+)
- npm or yarn
- MongoDB (v4.4+)
- Java 11+ (for backend)
- Maven (for backend)

### Step 1: Install Dependencies

```bash
# Root directory
npm install

# Install web dependencies
cd web && npm install && cd ..

# Install mobile dependencies (if needed)
cd mobile && npm install && cd ..

# Backend uses Maven (no npm install needed)
```

### Step 2: Configure Environment Variables

**Backend** (`backend/.env`):
```env
MONGODB_URI=mongodb://127.0.0.1:27017/clearance_system
SERVER_PORT=8080
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION_MINUTES=120
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=admin@123
```

**Web** (`web/.env`):
```env
VITE_API_BASE_URL=/api/v1
```

### Step 3: Start MongoDB

```bash
# Option A: Using Docker (recommended)
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Option B: Using npm script
npm run dev:mongo

# Option C: Using installed MongoDB
mongod --dbpath /path/to/data
```

### Step 4: Start Backend

```bash
# From root or backend directory
npm run dev:backend

# Or with Maven directly
cd backend && mvn spring-boot:run

# Verify: http://localhost:8080/api/v1/health
```

### Step 5: Start Web Development Server

```bash
# From root or web directory
npm run dev:web

# Opens at: http://localhost:3000
```

## 🧪 Testing Authentication & Staff Features

### Automated Test Script

**On Windows (PowerShell)**:
```powershell
powershell -ExecutionPolicy Bypass -File test-auth.ps1
```

**On macOS/Linux (Bash)**:
```bash
bash test-auth.sh
```

This script tests:
- ✅ Backend health
- ✅ Database connectivity
- ✅ Admin login
- ✅ Current user endpoint
- ✅ List campuses
- ✅ List staff users
- ✅ List departments
- ✅ Staff queue availability

### Manual Testing Steps

#### Test 1: Admin Login
1. Navigate to http://localhost:3000
2. Click "Open Admin Dashboard" (tap university logo 5 times)
3. Enter credentials:
   - **Username**: admin
   - **Password**: admin@123
4. Should see admin dashboard with staff management

#### Test 2: Staff Login - Campus Selection
1. Navigate to http://localhost:3000/login
2. Select campus (TEWODROS, MARAKI, or FASIL)
3. Enter staff credentials (create staff user if needed)
4. Click "Access Clearance Dashboard"
5. Should redirect to `/campus/{campusSlug}/staff`

#### Test 3: Staff Dashboard Access
1. Login as any staff role (LIBRARIAN, PROCTOR, etc.)
2. Observe staff workspace:
   - Queue of clearance requests
   - Student list (campus-filtered)
   - Ability to create liabilities
   - Inquiry management

#### Test 4: Campus-Based Access Control
1. Login as staff on TEWODROS
2. Note students visible
3. Change URL to different campus manually: `/campus/maraki/staff`
4. Should redirect to mismatch page (campus validation)

#### Test 5: Student Clearance Request
1. Login as student
2. Create clearance request (semester/final/withdrawal)
3. View request status
4. See updates from staff

## 🔑 Default Test Accounts

### Admin Account
```
Username: admin
Password: admin@123
Role: SYSTEM_ADMIN
Campus: (all)
```

### Creating Test Staff Users

**Via Admin Dashboard**:
1. Login as admin
2. Go to "Staff Users" section
3. Click "Create Staff User"
4. Fill form:
   - Username: `librarian1`
   - Email: `librarian@gondar.edu`
   - Role: `LIBRARIAN`
   - Campus: `TEWODROS`
   - Department: (optional)
5. Set temporary password
6. Save

**Via API** (curl):
```bash
curl -X POST http://localhost:8080/api/v1/admin/staff-users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "librarian1",
    "email": "librarian@gondar.edu",
    "role": "LIBRARIAN",
    "campusId": "TEWODROS",
    "departmentId": null,
    "temporaryPassword": "temp@123"
  }'
```

## 📡 API Endpoints Reference

### Authentication
```
POST   /api/v1/auth/login                    - Login with campus selection
GET    /api/v1/auth/me                       - Get current user
POST   /api/v1/auth/change-password          - Change password
GET    /api/v1/auth/test-debug               - Debug: List all users
```

### Staff Endpoints
```
GET    /api/v1/staff/students                - List visible students
GET    /api/v1/staff/queue                   - Get clearance queue
GET    /api/v1/staff/students/{id}/clearance-requests
GET    /api/v1/staff/students/{id}/clearance
PATCH  /api/v1/staff/checks/{id}/review      - Submit check decision
POST   /api/v1/staff/liabilities             - Create liability
GET    /api/v1/staff/inquiries               - List inquiries
PATCH  /api/v1/staff/inquiries/{id}/respond  - Respond to inquiry
```

### Admin Endpoints
```
POST   /api/v1/admin/staff-users             - Create staff
GET    /api/v1/admin/staff-users             - List staff
PUT    /api/v1/admin/staff-users/{id}        - Update staff
PATCH  /api/v1/admin/staff-users/{id}/activate
GET    /api/v1/admin/students                - List students
POST   /api/v1/admin/students                - Create student
```

### Resource Endpoints
```
GET    /api/v1/campuses                      - List campuses
GET    /api/v1/departments                   - List departments
GET    /api/v1/departments?campusId=...      - List departments by campus
```

## 🐛 Troubleshooting

### Issue: "Cannot reach the clearance API"
**Solution**:
```bash
# Check if backend is running
curl http://localhost:8080/api/v1/health

# If not running:
npm run dev:backend
```

### Issue: MongoDB Connection Refused
**Solution**:
```bash
# Check if MongoDB is running
netstat -an | grep 27017

# Start MongoDB
npm run dev:mongo
# or
docker run -d -p 27017:27017 mongo:latest
```

### Issue: Login Fails with "User not found"
**Solution**:
```bash
# Check available users
curl http://localhost:8080/api/v1/auth/test-debug

# Create staff user via admin dashboard
# or use API endpoint above
```

### Issue: "Campus Mismatch" Error
**Solution**:
- Ensure user's campus ID matches route campus
- Create user with correct campus ID
- Example: LIBRARIAN on TEWODROS campus should only access `/campus/tewodros/...`

### Issue: 401 Unauthorized on Staff Endpoints
**Solution**:
- Verify token is being sent: `Authorization: Bearer <token>`
- Check token hasn't expired (120 min default)
- Verify user has staff role (not STUDENT or SYSTEM_ADMIN)

## 📊 Database Seeding

The application automatically creates:
- ✅ Default admin user (if `BOOTSTRAP_ADMIN_ENABLED=true`)
- ✅ Three campuses (TEWODROS, MARAKI, FASIL)
- ✅ Department structure

You can create additional test data via:
1. Admin dashboard
2. API endpoints
3. Direct MongoDB inserts

## 🔐 Security Notes

1. **JWT Tokens**: 120-minute expiration (configurable)
2. **Campus Isolation**: Staff can only access their campus
3. **Role-Based Access**: Each endpoint has specific role requirements
4. **Password Hashing**: BCrypt with salt
5. **Session Management**: 401 invalidates tokens

## 📝 Deployment Checklist

Before deploying to production:
- [ ] Change `JWT_SECRET` to strong random value
- [ ] Set `VITE_API_BASE_URL` to production API URL
- [ ] Configure `CHAPA_*` variables for payment gateway
- [ ] Set up SMTP for email notifications (if implemented)
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Set up MongoDB backup strategy
- [ ] Configure rate limiting
- [ ] Enable audit logging

## 📞 Support

For issues or questions:
1. Check this documentation
2. Run `test-auth.ps1` to diagnose
3. Check browser console for errors
4. Check backend logs: `npm run dev:backend`
5. Check MongoDB: `mongo` cli

## 📚 Additional Resources

- [Authentication & Staff Verification Guide](./AUTHENTICATION_AND_STAFF_VERIFICATION.md)
- [API Design Documentation](./docs/api-design.md)
- [Architecture Documentation](./docs/architecture.md)
- [Data Model Documentation](./docs/data-model.md)

---

**Version**: 1.0  
**Last Updated**: May 12, 2026  
**Status**: ✅ Complete & Tested
