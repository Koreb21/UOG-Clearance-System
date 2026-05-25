# UGClear — Local Run Instructions

## Prerequisites
- **Docker** (for MongoDB)
- **Node.js 20+** (for web app)
- **Java 17+** (for backend)
- **Maven** (for backend)

## 1. Start MongoDB (Docker)
```bash
# From the project root:
docker compose up -d

# Verify it is running:
docker ps
# You should see "clearance-mongo" running on port 27017
```

## 2. Start the Backend (VS Code)
```bash
# Open a terminal in VS Code at the project root:
cd backend
mvn spring-boot:run

# The backend starts on http://localhost:8080
# Default admin login: admin / admin@123
```

## 3. Start the Web App (VS Code)
```bash
# Open another terminal in VS Code:
cd web
npm install   # only the first time
npm run dev

# The web app opens on http://localhost:3000
```

## 4. Stop Everything
```bash
# Stop the backend: Ctrl+C in the backend terminal
# Stop the web app: Ctrl+C in the web terminal
# Stop MongoDB:
docker compose down

# To also delete the database volume:
docker compose down -v
```

## Environment Variables (optional)
You can create a `.env` file in the `backend/` folder:
```
MONGO_URI=mongodb://localhost:27017/clearance_system
SERVER_PORT=8080
JWT_SECRET=your-secret-key-here
BOOTSTRAP_ADMIN_ENABLED=true
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=admin@123
```
