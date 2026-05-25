# 🎯 QUICK REFERENCE - ClearanceSystem

## Right Now: EVERYTHING IS RUNNING ✅

```
Backend API:     http://localhost:8080  ✅ RUNNING
Frontend Web:    http://localhost:3000  ✅ RUNNING  
Database (MongoDB): localhost:27017     ✅ RUNNING
```

---

## 🔓 LOGIN CREDENTIALS

| Role | Username | Password | Portal |
|------|----------|----------|--------|
| Admin | `admin` | `admin@123` | http://localhost:3000 |
| Student | `UGR-2026-0001` | `UGR-2026-0001` | http://localhost:3000 |

---

## 🖥️ SERVICES RUNNING

### Terminal 1: Backend
```powershell
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem\backend
mvn spring-boot:run
```
✅ Running on port 8080

### Terminal 2: Frontend  
```powershell
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem\web
npm run dev
```
✅ Running on port 3000

### Terminal 3: MongoDB (Local)
```powershell
mongod --dbpath "C:\data\db" --port 27017
```
✅ Running on port 27017

---

## 🎮 WHAT YOU CAN DO NOW

### As Admin
1. ✅ View 10+ staff members
2. ✅ Search users by name/ID
3. ✅ Assign roles
4. ✅ Manage student accounts
5. ✅ View system statistics

### As Student
1. ✅ View clearance status
2. ✅ See required checks
3. ✅ Make payments
4. ✅ Download QR certificate

### As Staff
1. ✅ View assigned students
2. ✅ Process clearance checks
3. ✅ Approve/reject items
4. ✅ Update student status

---

## 🔧 TROUBLESHOOTING QUICK FIXES

### "Connection Refused to MongoDB"
```powershell
Get-Process mongod
# If nothing shows, mongod is not running
# Start it: mongod --dbpath "C:\data\db" --port 27017
```

### "Backend won't start"
```powershell
# Port 8080 in use?
netstat -ano | findstr :8080
# Kill: taskkill /PID <PID> /F
```

### "Frontend blank page"
```powershell
# Hard refresh: Ctrl+Shift+R
# Or restart: cd web && npm run dev
```

### "Login fails"
1. Check MongoDB is running
2. Check backend is running
3. Verify credentials (admin/admin@123)
4. Check browser console (F12)

---

## 📱 PORTS & URLS

| Service | Port | URL |
|---------|------|-----|
| MongoDB | 27017 | mongodb://127.0.0.1:27017 |
| Backend | 8080 | http://localhost:8080 |
| Frontend | 3000 | http://localhost:3000 |
| Mobile Web | 19006 | http://localhost:19006 |

---

## 📝 IMPORTANT FILES

### Config
- Backend Config: `backend/src/main/resources/application.yml`
- Frontend Config: `web/vite.config.ts`
- Docker Config: `docker-compose.yml`

### Setup Guides
- Complete Setup: `COMPLETE_SETUP_GUIDE.md` ← READ THIS
- Docker Setup: `DOCKER_AND_MONGODB_SETUP.md`
- Project README: `README.md`
- Architecture: `docs/architecture.md`

---

## 🚀 BASIC WORKFLOW

1. **Start MongoDB**
   ```powershell
   mongod --dbpath "C:\data\db" --port 27017
   ```

2. **Start Backend** (new terminal)
   ```powershell
   cd backend
   mvn spring-boot:run
   ```

3. **Start Frontend** (new terminal)
   ```powershell
   cd web
   npm run dev
   ```

4. **Open Browser**
   ```
   http://localhost:3000
   ```

5. **Select Campus** → Login with `admin/admin@123`

6. **Done!** ✅ You're in the admin dashboard

---

## 📊 TEST DATA

### Pre-seeded Users (16 total)
- Koreb Student (UGR-2026-0001)
- Test Student (UGR-2026-0002)
- 10+ staff members
- 1 admin account

### Default Passwords
- **Admin**: `admin@123`
- **Students**: Same as their ID (UGR-2026-0001 = password: UGR-2026-0001)

---

## 🔒 SECURITY (CURRENT)

- JWT tokens: 120 minutes expiration
- Passwords: bcrypt hashed
- CORS: localhost:3000 allowed
- Auth: Custom Authentication Filter

---

## ✨ FEATURES WORKING

✅ Multi-campus system  
✅ Role-based access (5 roles)  
✅ Student clearance tracking  
✅ Department verification  
✅ Payment processing interface  
✅ QR certificate generation  
✅ Audit logging  
✅ User search/filtering  
✅ Profile management  
✅ Responsive design  

---

## 📞 GETTING HELP

1. **Check logs**: Look at terminal output
2. **Check guides**: Read `COMPLETE_SETUP_GUIDE.md`
3. **Check browser console**: F12 in browser
4. **Check MongoDB**: Use mongosh to query database
5. **Check ports**: Make sure services aren't using same port

---

## 🎯 NEXT STEPS

- [ ] Create a test student
- [ ] Submit a clearance request
- [ ] Process student through departments
- [ ] Make a payment
- [ ] Generate QR certificate
- [ ] Export reports
- [ ] Test mobile app (optional)

---

## 💡 TIPS

- Use Firefox/Chrome Developer Tools (F12) to debug
- Access MongoDB: `mongosh` from command line
- Check API directly: `curl http://localhost:8080/api/v1/health`
- API returns JSON - useful for integration testing
- Hot-reload: Changes to frontend code auto-refresh
- Database persists: Data saved even after restart

---

**Your system is ready to use! 🎉**

