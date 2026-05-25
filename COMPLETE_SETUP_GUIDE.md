# ClearanceSystem - COMPLETE SETUP & OPERATION GUIDE

## ✅ CURRENT STATUS: FULLY OPERATIONAL

Your university clearance system is now **running successfully**. All components are connected and functional.

---

## 🚀 What's Running Right Now?

### 1. **Backend API Server** ✅
- **URL**: http://localhost:8080
- **Status**: Running (Spring Boot 3.3.0, Java 21)
- **Database**: MongoDB connected on port 27017
- **Features**: 
  - REST API endpoints for authentication, clearance workflows, payments
  - QR certificate generation
  - Role-based access control (Admin, Staff, Finance, Registrar, Student)

### 2. **Frontend Web Application** ✅
- **URL**: http://localhost:3000
- **Status**: Running (React 18.3.1 + TypeScript + Vite)
- **Features**:
  - Student clearance tracking dashboard
  - Admin user management
  - Payment processing interface
  - Campus-based access control

### 3. **Database** ✅
- **MongoDB**: Locally installed on your PC
- **Port**: 27017
- **Database**: `clearance_system`
- **Status**: Connected and responding

---

## 🔐 Authentication & Access

### Default Admin Account
```
Username: admin
Password: admin@123
Role: SYSTEM_ADMIN
```

### How Login Works
1. User selects campus (Atse Tewodros, Maraki, or Atse Fasil)
2. Enters username and password
3. Backend authenticates against MongoDB
4. JWT token issued for session
5. User redirected to role-specific dashboard

### User Roles
- **SYSTEM_ADMIN**: Full system access, user management
- **REGISTRAR**: Clearance certificate issuance
- **FINANCE**: Payment verification
- **DEPARTMENT_STAFF**: Student liability verification
- **STUDENT**: Clearance tracking and payment

---

## 📊 System Features (Now Available)

### Admin Dashboard
- User registry management
- Role assignment
- Profile security settings
- Staff statistics

### Student Features
- View clearance request status
- Track departmental checks
- Payment management via Chapa
- Download QR clearance certificate

### Staff Features (Department/Finance/Registrar)
- View assigned students
- Process clearance checks
- Verify payments
- Approve/reject liabilities

---

## 🛠️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│           Frontend (React + Vite)                       │
│           http://localhost:3000                         │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP/REST
                   ▼
┌─────────────────────────────────────────────────────────┐
│           Backend API (Spring Boot)                     │
│           http://localhost:8080                         │
│           - Authentication (JWT)                        │
│           - Clearance Workflows                         │
│           - Payment Integration                         │
│           - QR Certificate Generation                   │
└──────────────────┬──────────────────────────────────────┘
                   │ MongoDB Driver
                   ▼
┌─────────────────────────────────────────────────────────┐
│           MongoDB Database                              │
│           localhost:27017/clearance_system              │
│           - Users                                       │
│           - Clearance Requests                          │
│           - Payments                                    │
│           - Audit Logs                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 Test Account Information

### Pre-seeded Test Users
The system includes sample users for testing:
- **Koreb Student** (ID: UGR-2026-0001)
- **Test Student** (ID: UGR-2026-0002)
- Plus 10+ additional staff members across departments

**Default student password = Student ID** (change on first login)

---

## 🔧 How MongoDB is Configured

### Local MongoDB (Current Setup)
Your MongoDB is running locally on your PC. The backend automatically connects to:
```
mongodb://127.0.0.1:27017/clearance_system
```

**Advantages**:
- No Docker dependency
- Fast development cycle
- Direct access to MongoDB CLI
- Easier debugging

### Verifying MongoDB Connection
```powershell
# Check if MongoDB is running
Get-Process mongod

# Test MongoDB directly
mongosh --eval "db.adminCommand('ping')"
# Output: { ok: 1 }
```

---

## 🐳 Docker Alternative (For Production)

If you prefer to use Docker (not currently running), you can use:

```powershell
# Start MongoDB in Docker
docker-compose up -d mongo

# Verify it's running
docker-compose ps

# Check logs
docker-compose logs mongo
```

**Docker vs Local**:
| Aspect | Local MongoDB | Docker |
|--------|--------------|--------|
| Setup | Simple | Requires Docker Desktop |
| Performance | Fast | Slight overhead |
| Data Persistence | Uses MongoDB default paths | Volume-based |
| Ideal For | Development | CI/CD & Production |

---

## 🚀 How to Use the System

### For Admin Users

1. **Go to**: http://localhost:3000
2. **Select Campus**: Atse Tewodros (or any campus)
3. **Login**: 
   - Username: `admin`
   - Password: `admin@123`
4. **Access Dashboard**: Registrar Management Panel
5. **Available Actions**:
   - Register new students (User Registry)
   - Assign staff roles (Role Assignment)
   - Manage security settings (Profile Security)
   - View staff statistics

### For Student Users

1. **Go to**: http://localhost:3000
2. **Select Campus**: Your campus
3. **Login**: With your student ID and password
4. **Dashboard Shows**:
   - Clearance request status
   - Required departmental checks
   - Payment requirements
   - QR certificate (once cleared)

### For Staff Users

1. **Login**: With staff credentials
2. **Dashboard Shows**:
   - Assigned students
   - Pending clearance items
   - Action buttons to approve/reject

---

## 🔍 Troubleshooting

### Issue: "Connection Refused to MongoDB"
```powershell
# Check if MongoDB is running
Get-Process mongod

# If not running, start MongoDB
mongod --dbpath "C:\data\db" --port 27017
```

### Issue: "Login fails with invalid credentials"
**Check**:
1. MongoDB is running
2. Backend is running (check http://localhost:8080)
3. Credentials are correct (admin/admin@123)
4. Browser console for error messages

### Issue: "Frontend shows blank page"
```powershell
# Hard refresh browser
# Press: Ctrl+Shift+R

# Or restart the web server
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem\web
npm run dev
```

### Issue: "Backend won't start"
```powershell
# Check if port 8080 is in use
netstat -ano | findstr :8080

# Kill process if needed
taskkill /PID <PID> /F

# Then restart backend
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem\backend
mvn spring-boot:run
```

### Issue: "Port 3000 already in use"
```powershell
# Stop the web server (Ctrl+C in terminal)
# Or kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 📱 Mobile App (Optional)

The project includes a React Native mobile app for students:

```powershell
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem\mobile
npm install
npm start

# Then choose:
# - 'w' for web preview
# - Scan QR code with Expo app for mobile
```

**Runs on**: http://localhost:19006 (web preview)

---

## 🔐 Security Notes

### Current Configuration
- JWT tokens valid for 120 minutes
- Passwords hashed with bcrypt
- CORS enabled for localhost:3000
- HTTPS required in production (not in dev)

### For Production
Before deploying to production:
1. Change JWT secret in `backend/src/main/resources/application.yml`
2. Change QR signing secret
3. Configure Chapa payment keys
4. Set up HTTPS/SSL certificates
5. Configure proper MongoDB authentication
6. Set up environment variables for secrets

---

## 📚 Key Files & Locations

### Backend
- **API Code**: `backend/src/main/java/com/uog/clearance/`
- **Configuration**: `backend/src/main/resources/application.yml`
- **Database Models**: `backend/src/main/java/com/uog/clearance/*/model/`
- **REST Controllers**: `backend/src/main/java/com/uog/clearance/*/controller/`

### Frontend
- **React Pages**: `web/src/pages/`
- **React Components**: `web/src/components/`
- **API Client**: `web/src/lib/api.ts`
- **Authentication Module**: `web/src/modules/auth/`

### Database
- **Database Name**: `clearance_system`
- **Collections**: users, clearance_requests, payments, audit_logs, etc.

---

## 🔄 Development Workflow

### Making Code Changes

**Backend Changes**:
1. Edit Java files in `backend/src/`
2. Maven automatically recompiles (if using `mvn spring-boot:run`)
3. Restart backend if compilation fails

**Frontend Changes**:
1. Edit React files in `web/src/`
2. Vite hot-reloads automatically
3. See changes instantly in browser

### Database Changes
1. Models are defined in Java (backend)
2. MongoDB automatically creates collections on first insert
3. No migrations needed for development

---

## 📞 API Endpoints (For Testing)

### Health Check (Public)
```
GET http://localhost:8080/api/v1/health
```

### Authentication
```
POST http://localhost:8080/api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin@123"
}
```

### Current User (Requires Token)
```
GET http://localhost:8080/api/v1/auth/me
Authorization: Bearer <token>
```

### All Endpoints
See documentation in `docs/api-design.md`

---

## 📊 Database Collections

Your MongoDB has these collections:
- **users**: User accounts (students, staff, admin)
- **clearance_requests**: Student clearance submissions
- **clearance_checks**: Individual departmental checks
- **payments**: Payment records
- **qr_certificates**: QR clearance certificates
- **audit_logs**: System activity logs
- **campuses**: Campus definitions
- **status_inquiries**: Student inquiries to staff
- **student_identities**: Student profile data

---

## ✨ What Works Now

✅ User Authentication (JWT)  
✅ Role-Based Access Control  
✅ Campus Isolation (multi-tenant)  
✅ Student Clearance Workflow  
✅ Department Liability Management  
✅ Payment Integration Interface  
✅ QR Certificate Generation  
✅ Audit Logging  
✅ Search & Filtering  
✅ Responsive Design (mobile-friendly)  

---

## 🎯 Next Steps

1. **Explore the Admin Dashboard**: Create test students, manage users
2. **Test Login Flow**: Try different user roles
3. **Review Code**: Check `backend/src/main` for business logic
4. **Modify Settings**: Update environment variables as needed
5. **Integration Testing**: Test complete clearance workflows
6. **Performance Testing**: Load test with multiple concurrent users
7. **Production Deployment**: Use Docker Compose for deployment

---

## 📞 Support & Documentation

- **Architecture Docs**: See `docs/architecture.md`
- **API Design**: See `docs/api-design.md`
- **Data Model**: See `docs/data-model.md`
- **Requirements**: See `docs/requirements.md`

---

## 🎉 Summary

Your University Clearance System is now:
- ✅ **Running** on your local machine
- ✅ **Connected** to MongoDB
- ✅ **Authenticated** with admin account
- ✅ **Functional** with all core features
- ✅ **Ready** for testing and customization

**You can now**:
1. Log in as admin
2. Create and manage student accounts
3. Simulate clearance workflows
4. Test all features end-to-end
5. Deploy to production when ready

Enjoy your clearance system! 🚀

