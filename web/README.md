# Web Frontend

This app is the React web client for the University of Gondar clearance platform.

## Stack

- React
- TypeScript
- Vite
- React Router

## Current Frontend Foundation

- login page connected to backend `/api/v1/auth/login`
- auth state and token persistence
- backend `/api/v1/auth/me` hydration on refresh
- protected routes
- role-based dashboard shells for:
  - student
  - staff
  - system admin
- visual foundation for the next workflow pages

## Run

```powershell
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem\web
npm install
npm run dev
```

If your backend runs on a different host or port, set:

```powershell
$env:VITE_API_BASE_URL="http://localhost:8080/api/v1"
```
