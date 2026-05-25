# Docker & MongoDB Setup Guide for ClearanceSystem

## Issue Summary
- MongoDB was embedded in Docker but not properly responding
- Login errors occurred due to database connectivity issues
- You've downloaded MongoDB 28 locally on your PC

## Solution: Use Local MongoDB (Recommended for Development)

### Option 1: Run MongoDB Locally (Simplest - Windows)

MongoDB is already downloaded on your PC. Here's how to use it:

**Step 1: Start MongoDB locally**
```powershell
# MongoDB default port is 27017
# Make sure MongoDB service is running on your system
# OR start mongod manually from MongoDB installation directory

# If you have MongoDB installed, run:
mongod --dbpath "C:\data\db" --port 27017
```

**Step 2: Backend will automatically connect**
- Backend looks for MongoDB at `mongodb://127.0.0.1:27017/clearance_system`
- No code changes needed

---

### Option 2: Use Docker (If you want containerized MongoDB)

**Step 1: Ensure Docker Desktop is running**
```powershell
docker --version
docker-compose --version
```

**Step 2: Start MongoDB via Docker**
```powershell
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem

# Start only MongoDB container
docker-compose up -d mongo

# Check if it's running
docker-compose ps
```

**Step 3: Verify MongoDB is responding**
```powershell
# Wait 15 seconds for MongoDB to fully start, then test:
docker exec clearance-mongo mongosh --quiet --eval "db.adminCommand('ping').ok"
# Should return: 1
```

---

## Default Login Credentials

**Admin Account** (bootstrapped automatically):
- Username: `admin`
- Password: `admin@123`

**Test Student Account** (create via admin):
- Create in admin dashboard
- Default student password = Student ID (e.g., if student ID is "STU001", password is "STU001")

---

## Complete Startup Instructions

### Start Everything in Order:

**Terminal 1: MongoDB**
```powershell
# LOCAL MONGODB (Recommended)
mongod --dbpath "C:\data\db" --port 27017

# OR DOCKER MONGODB
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem
docker-compose up -d mongo
```

Wait 5 seconds for MongoDB to start.

**Terminal 2: Backend (Spring Boot)**
```powershell
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem\backend
mvn spring-boot:run
# Starts on http://localhost:8080
# Health check: http://localhost:8080/api/v1/health (public)
```

**Terminal 3: Web Frontend**
```powershell
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem\web
npm install  # Only first time
npm run dev
# Starts on http://localhost:5173
```

**Terminal 4: Mobile (Optional)**
```powershell
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem\mobile
npm install  # Only first time
npm start
# Opens Expo DevTools - choose 'w' for web or scan QR with Expo app
```

---

## Service Ports & URLs

| Service | URL | Purpose |
|---------|-----|---------|
| MongoDB | localhost:27017 | Database |
| Backend API | http://localhost:8080 | REST API |
| Web App | http://localhost:5173 | Student/Admin web UI |
| Mobile | http://localhost:19006 | Mobile web preview |

---

## Testing Login

### 1. Test Backend is Running
```powershell
# Public health endpoint (no auth needed)
curl http://localhost:8080/api/v1/health
```

### 2. Login with Admin Account
```powershell
$body = @{
    username = "admin"
    password = "admin@123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### 3. Access Web App
Go to: **http://localhost:5173**
- Login with `admin` / `admin@123`
- Or create a student and login

---

## Troubleshooting

### "Connection refused to MongoDB"
**Problem**: MongoDB not running
**Solution**:
```powershell
# Check if MongoDB is running
Get-Process mongod -ErrorAction SilentlyContinue
# If nothing shows, start MongoDB

# Or check Docker
docker-compose logs mongo
```

### "Login fails with 'User not found'"
**Problem**: MongoDB connected but admin not bootstrapped
**Solution**:
- Restart backend: It auto-creates admin on startup
- Check logs for "Bootstrapped SYSTEM_ADMIN"

### "Port 8080 already in use"
**Solution**:
```powershell
# Find what's using port 8080
netstat -ano | findstr :8080
# Kill process: taskkill /PID <PID> /F
```

---

## Production Setup

For production, use the Docker Compose setup with proper secrets:
```powershell
docker-compose up  # Full stack with secrets
```

---

## Summary

✅ Use **local MongoDB 28** (already on your PC) for easiest development
✅ Start **backend** (auto-creates admin account)
✅ Start **web/mobile** frontends
✅ Login with **admin/admin@123**

