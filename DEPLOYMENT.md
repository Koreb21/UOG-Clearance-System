# Deployment and operations

This document covers secrets, Chapa sandbox testing, end-to-end verification, and mobile API configuration.

## 1. Environment variables (production)

Use `backend/env.example` as a checklist. Minimum changes for production:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string (Atlas or self-hosted). |
| `JWT_SECRET` | Signs JWT access tokens — must be unique and long. |
| `QR_SIGNING_SECRET` | Signs QR clearance payloads — keep separate from JWT. |
| `BOOTSTRAP_ADMIN_*` | Optional first admin; consider `BOOTSTRAP_ADMIN_ENABLED=false` after onboarding. |
| `STUDENT_MEDIA_DIR` | Writable directory for uploaded student images. |

Frontend clients:

| App | Variable |
|-----|----------|
| Web (Vite) | `VITE_API_BASE_URL` — point to your API base, e.g. `https://api.example.edu/api/v1` |
| Mobile (Expo) | `EXPO_PUBLIC_API_BASE_URL` — same path; use HTTPS and real host in production |

## 2. Chapa sandbox workflow

1. Obtain sandbox keys from Chapa and set `CHAPA_PUBLIC_KEY`, `CHAPA_SECRET_KEY`.
2. Set `CHAPA_CALLBACK_URL` to your public backend URL plus `/api/v1/payments/chapa/callback`.
3. Configure Chapa dashboard **return URL** to your student web URL (matches `CHAPA_RETURN_URL`), e.g. `https://student.example.edu/payments/complete`.
4. Set `CHAPA_WEBHOOK_SECRET` if webhooks are enabled; backend verifies signatures when configured.
5. Run a test payment from the student portal (web or mobile). After redirect, finance records should update after server-side verification.

Production checklist: HTTPS everywhere, rotate keys, never expose `CHAPA_SECRET_KEY` to the browser.

## 3. End-to-end verification (manual)

With MongoDB running and backend started:

1. Open web `npm run dev`, log in as bootstrap admin (`admin` / `admin@123` unless changed).
2. Register a student on a campus; initial password equals **student ID** (see backend student creation logic).
3. Log in as that student (web or mobile), create a clearance request, confirm status loads.
4. Staff/finance/registrar flows: use staff accounts created by admin on the same campus.

Automated smoke tests: from `web/`, run `npm run test:e2e:install` once, then `npm run test:e2e`. Playwright starts Vite automatically (first run can take a few minutes). Alternatively, run `npm run dev` in one terminal and `npx playwright test` in another; set `reuseExistingServer` behavior via `CI` env as needed. The backend health spec skips if nothing listens on port 8080.

## 4. Mobile devices

- Physical phones cannot reach `localhost`; set `EXPO_PUBLIC_API_BASE_URL` to `http://YOUR_LAN_IP:8080/api/v1`.
- For deep links after Chapa payment, configure the app scheme in `mobile/app.json` (`expo.scheme`) and align Chapa return URLs.

## 5. Dependency hygiene

Run periodically:

```powershell
cd web; npm audit; npm audit fix
cd ..\mobile; npm audit; npm audit fix
```

Review remaining advisories before using `audit fix --force`.

**Current notes:** Web may still report moderate issues in `esbuild` via Vite 5 — fixing cleanly typically means upgrading to Vite 7/8 (verify your toolchain first). Expo mobile may still list transitive `postcss` / `uuid` advisories until the Expo SDK releases compatible bumps; avoid `audit fix --force` there unless you intend a major SDK downgrade.
