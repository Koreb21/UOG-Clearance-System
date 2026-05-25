# ClearanceSystem - Quick Start Guide

## 🚀 Running the Complete System

### Prerequisites
- Node.js v18+ with npm
- Java 21+
- Maven 3.9+
- Docker and Docker Compose
- Git

---

## Step 1: Start MongoDB Database

```powershell
# Navigate to project root
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem

# Start MongoDB container
docker compose up -d mongo

# Verify MongoDB is running
docker compose ps
```

**Expected Output**: `mongo` container status should be `Up` with health status `healthy`

---

## Step 2: Start Backend API (Terminal 1)

```powershell
# Navigate to project root
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem

# Option A: Using npm script
npm run dev:backend

# Option B: Using Maven directly
mvn -f backend/pom.xml spring-boot:run
```

**Expected Output**:
```
Started ClearanceBackendApplication in X.XXX seconds
MongoDB connected successfully
Bootstrap admin credentials loaded
13 security filters initialized
Listening on port 8080
```

**Verify Backend**: `curl http://127.0.0.1:8080/api/v1/health`

---

## Step 3: Start Web Frontend (Terminal 2)

```powershell
# Navigate to web directory
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem\web

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Expected Output**:
```
VITE v5.4.21 ready in 3387 ms
➜ Local: http://localhost:3000/
```

**Access Web App**: Open browser to `http://localhost:3000`

---

## Step 4: Start Mobile Frontend (Terminal 3) - Optional

```powershell
# Navigate to mobile directory
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem\mobile

# Install dependencies (first time only)
npm install

# Start Expo development server
npm run start
```

**Expected Output**:
```
Starting Metro Bundler
Expo QR code will be displayed
```

**Run Mobile App**: Scan QR code with Expo Go app on your phone

---

## 📱 Login Credentials

### Default Admin Account
- **Username**: `admin`
- **Password**: `admin@123`
- **Role**: SYSTEM_ADMIN
- **Campus**: TEWODROS

### Test Endpoints

#### Health Check
```powershell
Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/v1/health" -Method GET
```

#### Login (Get JWT Token)
```powershell
$body = @{username="admin"; password="admin@123"} | ConvertTo-Json
Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/v1/auth/login" `
  -Method POST -Body $body -ContentType "application/json"
```

#### Protected Endpoint (With Token)
```powershell
$loginResponse = @{username="admin"; password="admin@123"} | ConvertTo-Json | `
  Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/v1/auth/login" -Method POST `
  -ContentType "application/json"
$token = ($loginResponse.Content | ConvertFrom-Json).accessToken
Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/v1/auth/me" `
  -Method GET -Headers @{Authorization="Bearer $token"}
```

---

## 🔍 System Status

### Check All Services Are Running

```powershell
# Check backend API
Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/v1/health" | Select-Object StatusCode

# Check web frontend
Invoke-WebRequest -Uri "http://localhost:3000/" | Select-Object StatusCode

# Check MongoDB
docker compose ps
```

### Expected Status
```
Backend: 200 OK ✅
Web: 200 OK ✅
MongoDB: Up (healthy) ✅
```

---

## 📊 Access Points

| Component | URL | Status |
|-----------|-----|--------|
| Backend API | http://127.0.0.1:8080/api/v1/ | ✅ Running |
| Web UI | http://localhost:3000/ | ✅ Running |
| Mobile Expo | Scan QR code | ✅ Ready |
| MongoDB | 127.0.0.1:27017 | ✅ Connected |

---

## 🛑 Stopping the System

### Stop Backend
```powershell
# Press Ctrl+C in Terminal 1 where backend is running
```

### Stop Web Frontend
```powershell
# Press Ctrl+C in Terminal 2 where web is running
```

### Stop Mobile Frontend
```powershell
# Press Ctrl+C in Terminal 3 where mobile is running
```

### Stop Database
```powershell
docker compose down mongo
```

### Stop All Services
```powershell
docker compose down
```

---

## 🐛 Troubleshooting

### Port 8080 Already in Use
```powershell
# Find and kill process using port 8080
netstat -ano | findstr ":8080"
taskkill /PID <PID> /F
```

### MongoDB Connection Failed
```powershell
# Check if container is running
docker compose ps mongo

# Check MongoDB logs
docker compose logs mongo

# Restart MongoDB
docker compose restart mongo
```

### Port 3000 Already in Use
```powershell
# Find and kill process using port 3000
netstat -ano | findstr ":3000"
taskkill /PID <PID> /F
```

### Dependencies Not Installed
```powershell
# For backend
cd backend
mvn clean install -DskipTests

# For web
cd web
npm install

# For mobile
cd mobile
npm install
```

---

## 🔐 Security Notes

- Default admin credentials are for **development only**
- Change credentials in production
- JWT tokens expire after 120 minutes
- All passwords are hashed with BCrypt
- CORS is open for local development (restrict in production)

---

## 📚 Additional Resources

- [Architecture Documentation](./docs/architecture.md)
- [API Design](./docs/api-design.md)
- [Data Model](./docs/data-model.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Docker Setup Guide](./DOCKER_AND_MONGODB_SETUP.md)

---

## ✅ System Health Checklist

Before using the system, ensure:

- [ ] MongoDB container is running and healthy
- [ ] Backend API responds to health check (200 OK)
- [ ] Web frontend loads at http://localhost:3000
- [ ] Can login with admin/admin@123
- [ ] JWT token is generated on successful login
- [ ] Authenticated endpoints return user data

---

**Status**: All Systems Operational ✅  
**Ready for Development**: Yes  
**Ready for Production**: Requires configuration changes (environment variables, credentials)
