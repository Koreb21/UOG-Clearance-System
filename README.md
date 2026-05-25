# University Clearance System

This repository contains the foundation for a multi-campus university clearance system for the University of Gondar.

## Campuses

- Atse Tewodros
- Maraki
- Atse Fasil

## Platform Scope

- Student mobile app
- Student web app
- Staff/admin web dashboard
- Spring Boot backend API
- MongoDB database
- Chapa payment integration

## Core Rules

- The system is one platform, but campus access is isolated.
- Staff can only review and approve students in their own campus.
- Students do not self-register; the super admin registers them.
- A QR clearance certificate is generated only when all required checks are cleared.
- Every approval and payment action must be audit logged.

## Repository Layout

- `docs/` system analysis and design
- `backend/` Spring Boot API
- `web/` React web applications
- `mobile/` React Native app

## First Build Order

1. Finalize requirements and permissions
2. Create backend domain model and authentication
3. Build staff dashboard workflows
4. Build student mobile and web tracking flows
5. Integrate Chapa payments
6. Add QR verification and registrar closure flow
