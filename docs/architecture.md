# Architecture and Scaffolding Plan

## Recommended Repository Style

Use a simple monorepo:

- `backend/` Spring Boot API
- `web/` React web apps
- `mobile/` React Native Expo app
- `docs/` project specification

## Backend Modules

Suggested Spring Boot package structure:

- `auth`
- `user`
- `student`
- `campus`
- `department`
- `clearance`
- `liability`
- `payment`
- `inquiry`
- `audit`
- `qr`
- `common`

## Web Applications

The web app can start as one React project with role-based routing:

- student portal
- staff dashboard
- finance dashboard
- registrar dashboard
- admin dashboard

This avoids duplicate setup early in development.

## Mobile Application

The mobile app focuses on student use cases:

- login
- profile
- clearance progress
- liability details
- payment handoff to Chapa web view
- QR certificate display
- cached last status for offline reading

## Security Design Notes

- Campus scope should be derived from the authenticated user token and verified on the backend.
- Never accept a campus value from the client as the final authority.
- JWT should contain `sub`, `role`, `campusId`, and optional `departmentId`.
- Use audit logging for all sensitive mutations.

## Student Registration Strategy

Initial plan:

- Admin creates students manually or through CSV import.
- Student receives ID-based username and temporary password.
- Password must be changed on first login.

Future improvement:

- Integrate with registrar master records
- Support batch activation by academic year and campus
