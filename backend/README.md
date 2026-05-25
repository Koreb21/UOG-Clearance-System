# Backend Scaffold

Target stack:

- Java 21
- Spring Boot
- Spring Security
- Spring Data MongoDB
- JWT authentication
- BCrypt password hashing

Suggested next backend tasks:

1. Add finance payment records and Chapa integration
2. Add registrar final-close and QR generation flow
3. Add CSV or Excel student import
4. Add change-password flow and first-login handling
5. Add campus and staff seed data for testing

## Current Starter Features

- JWT login and current-user endpoint
- change-password endpoint
- Student creation by `SYSTEM_ADMIN`
- student update and activate/deactivate endpoints
- CSV student import endpoint
- official student profile image and ID-card image upload endpoints
- staff-user creation by `SYSTEM_ADMIN`
- staff-user update and activate/deactivate endpoints
- Student clearance request creation
- Student clearance status endpoint
- Bootstrap `SYSTEM_ADMIN` account on startup
- bootstrap campus and department seed data
- Campus-limited staff student access
- Staff liability creation and clearing
- Departmental check review endpoint
- student and staff inquiry endpoints
- campus and department list endpoints
- audit log admin endpoint
- registrar request queue endpoint
- Audit logs for student creation, request creation, liabilities, and reviews
- Chapa payment initialization with server-side verify flow
- callback redirect and webhook endpoints for Chapa
- Manual finance payment recording
- QR certificate generation, verification, and registrar close flow

## MongoDB

The API expects MongoDB at **127.0.0.1:27017** by default (see `application.yml` / `MONGODB_URI`).

- **Docker (recommended):** from the **repository root** (parent of `backend/`), run `npm run dev:mongo`, then start the API. This uses `docker-compose.yml` in the root.
- **Local install:** run `mongod` listening on port **27017** with database `clearance_system` created on first use.
- Override URI: `MONGODB_URI=mongodb://user:pass@host:27017/clearance_system`.

## Bootstrap Admin Configuration

The backend can create the first admin user automatically on startup.

Environment variables:

- `BOOTSTRAP_ADMIN_ENABLED`
- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`

## New Identity and Chapa Notes

- trusted student identity images are uploaded by `SYSTEM_ADMIN`, not by students
- student media is stored under `STUDENT_MEDIA_DIR` or `storage/student-media`
- Chapa production flow should use:
  - `CHAPA_SECRET_KEY`
  - `CHAPA_WEBHOOK_SECRET`
  - `CHAPA_CALLBACK_URL`
  - `CHAPA_RETURN_URL`
- the backend now supports:
  - `POST /api/v1/payments/chapa/initiate`
  - `GET /api/v1/payments/chapa/callback`
  - `POST /api/v1/payments/chapa/webhook`
- callback and webhook events trigger server-side verification before finance is cleared
