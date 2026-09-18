# FEATURE IMPLEMENTATION PLAN — FEATURE A: SMART LOCATION / GOOGLE MAPS

## CURRENT STATUS
Phase 1: Read-Only Architecture Analysis Completed.

## SCOPE
Analysis and implementation plan for Feature A (Smart Location & Google Maps Integration) for the Food Management system.

## EXPLICIT "NO IMPLEMENTATION PERFORMED"
**NOTICE:** This document is purely architectural analysis and planning. **NO APPLICATION CODE WAS MODIFIED, NO PACKAGES WERE INSTALLED, NO DATABASE SCHEMA WAS ALTERED, NO API KEYS WERE CREATED, AND NO COMMITS OR PUSHES WERE EXECUTED DURING PHASE 1.**

---

## 1. FILES INSPECTED
The following files across backend and frontend were thoroughly inspected during Phase 1:

1. [`backend/prisma/schema.prisma`](file:///C:/Rudra_Workshop/Food-Management/backend/prisma/schema.prisma) — Database schema definition for `Donation` and other models.
2. [`backend/src/config/env.ts`](file:///C:/Rudra_Workshop/Food-Management/backend/src/config/env.ts) — Environment variable Zod validation and config exports.
3. [`backend/src/app.ts`](file:///C:/Rudra_Workshop/Food-Management/backend/src/app.ts) — Main Express application setup, CORS, security headers, rate limiters, and route registrations.
4. [`backend/src/shared/middleware/rate-limiter.middleware.ts`](file:///C:/Rudra_Workshop/Food-Management/backend/src/shared/middleware/rate-limiter.middleware.ts) — Existing rate limiting middlewares.
5. [`backend/src/modules/donations/dto/donation.dto.ts`](file:///C:/Rudra_Workshop/Food-Management/backend/src/modules/donations/dto/donation.dto.ts) — Zod validation schemas for donation creation and updates.
6. [`backend/src/modules/donations/controllers/donation.controller.ts`](file:///C:/Rudra_Workshop/Food-Management/backend/src/modules/donations/controllers/donation.controller.ts) — Donation API controller methods.
7. [`backend/src/modules/donations/services/donation.service.ts`](file:///C:/Rudra_Workshop/Food-Management/backend/src/modules/donations/services/donation.service.ts) — Business logic for donations.
8. [`frontend/src/modules/donors/components/CreateDonationModal.tsx`](file:///C:/Rudra_Workshop/Food-Management/frontend/src/modules/donors/components/CreateDonationModal.tsx) — Current donation creation form component.
9. [`frontend/src/modules/donors/components/EditDonationModal.tsx`](file:///C:/Rudra_Workshop/Food-Management/frontend/src/modules/donors/components/EditDonationModal.tsx) — Current donation edit form component.
10. [`frontend/src/modules/donors/types/donor.types.ts`](file:///C:/Rudra_Workshop/Food-Management/frontend/src/modules/donors/types/donor.types.ts) — TypeScript interfaces for donor payloads and models.
11. [`frontend/src/modules/donors/services/donation.service.ts`](file:///C:/Rudra_Workshop/Food-Management/frontend/src/modules/donors/services/donation.service.ts) — Frontend API service for donations.
12. [`frontend/src/services/api/apiClient.ts`](file:///C:/Rudra_Workshop/Food-Management/frontend/src/services/api/apiClient.ts) — Axios client with token handling and response interceptors.
13. [`backend/package.json`](file:///C:/Rudra_Workshop/Food-Management/backend/package.json) & [`frontend/package.json`](file:///C:/Rudra_Workshop/Food-Management/frontend/package.json) — Active dependencies and scripts.
14. [`backend/.env.example`](file:///C:/Rudra_Workshop/Food-Management/backend/.env.example) & [`frontend/.env.example`](file:///C:/Rudra_Workshop/Food-Management/frontend/.env.example) — Environment configuration templates.

---

## 2. FINDINGS & ARCHITECTURE ANALYSIS

### A. Database Schema Capability
- **Finding:** The `Donation` table in [`backend/prisma/schema.prisma`](file:///C:/Rudra_Workshop/Food-Management/backend/prisma/schema.prisma#L192-L229) already contains the following fields:
  - `pickupAddress`: `String @map("pickup_address") @db.Text` (Required)
  - `pickupLatitude`: `Decimal? @map("pickup_latitude") @db.Decimal(9, 6)` (Optional)
  - `pickupLongitude`: `Decimal? @map("pickup_longitude") @db.Decimal(9, 6)` (Optional)
- **Verdict:** **NO DATABASE SCHEMA CHANGES ARE REQUIRED.** The existing database model fully supports storing geolocation coordinates (`pickupLatitude`, `pickupLongitude`) alongside the text address.

### B. Backend API & DTO Capability
- **Finding:** In [`backend/src/modules/donations/dto/donation.dto.ts`](file:///C:/Rudra_Workshop/Food-Management/backend/src/modules/donations/dto/donation.dto.ts#L35-L85):
  - `createDonationSchema` already validates `pickupLatitude` (-90 to 90) and `pickupLongitude` (-180 to 180).
  - It enforces co-existence validation: both latitude and longitude must either be provided together or omitted together.
- **Verdict:** The existing donation API (`POST /api/v1/donations` and `PATCH /api/v1/donations/:id`) already accepts and persists latitude and longitude. No backend schema refactoring is needed.

### C. Recommended Google APIs & Browser APIs
- **Browser Geolocation API (`navigator.geolocation.getCurrentPosition`)**:
  - **Required:** YES. Used to capture donor's current GPS position when clicking "Use my current location".
  - **Cost:** $0 (Native browser API).
  - **Permission Handling:** Must handle user permission denial gracefully without blocking manual address entry.
- **Google Maps JavaScript API**:
  - **Required:** YES. Used to render an embedded interactive map on the frontend showing a pin marker at the selected coordinates.
  - **Cost:** Covered under Google Cloud free tier ($200 monthly credit = ~28,000 map loads/month).
- **Google Geocoding API**:
  - **Required:** YES (Reverse Geocoding only). Used to convert `(latitude, longitude)` coordinates obtained from Geolocation into a readable street address string for `pickupAddress`.
  - **Implementation Choice:** Reverse geocoding requests should be routed through a dedicated backend proxy endpoint (`POST /api/v1/location/reverse-geocode`) or executed client-side via Google Maps JS Geocoder. A backend proxy route allows strict rate-limiting, IP-based protection, and server-side secret key protection.
- **Google Places API / Autocomplete**:
  - **Required:** NO. Google Places Autocomplete introduces unnecessary cost ($17/1,000 sessions) and complex key exposures. Manual text address entry + Geolocation reverse geocoding + Interactive Map Pin Selection provides 100% of the desired UX without Places Autocomplete overhead.

---

## 3. PROPOSED ARCHITECTURE & DATA FLOW

```
Donor clicks "Use my current location"
  ↓
Browser Geolocation API (lat, lng)
  ↓
Frontend sends request to Backend Proxy: POST /api/v1/location/reverse-geocode
  ↓ (Guarded by Authenticate + MAPS_ENABLED + Location Rate Limiter)
Backend calls Google Geocoding API (using GOOGLE_MAPS_API_KEY)
  ↓
Formatted address returned to Frontend
  ↓
Frontend populates pickupAddress, pickupLatitude, pickupLongitude in CreateDonationModal
  ↓
Google Map component renders pin at coordinates; donor can drag pin to refine position
  ↓
Donor confirms and submits form -> POST /api/v1/donations (Existing endpoint)
```

---

## 4. SECURITY & COST-CONTROL MECHANISMS

1. **API Key Isolation:**
   - **Backend Secret:** `GOOGLE_MAPS_API_KEY` stays strictly on the Node.js backend. NEVER exposed to frontend bundles.
   - **Frontend Browser Key (if Maps JS SDK embedded directly):** Restricted in Google Cloud Console by **HTTP Referrer** (e.g. `http://localhost:5173/*` for dev, production domain for prod).
2. **Layered Rate Limiting:**
   - **Global Rate Limiter:** Existing 300 req / 15 min preserved.
   - **Location Proxy Rate Limiter:** New dedicated rate limiter for reverse geocoding: `RATE_LIMIT_LOCATION_WINDOW_MS=60000` (1 min), `RATE_LIMIT_LOCATION_MAX=10` per user / IP.
3. **Coordinate Bounds & Input Validation:**
   - Latitude: validated between `-90.0` and `90.0`.
   - Longitude: validated between `-180.0` and `180.0`.
   - Request body validated with Zod before calling Google API.
4. **Caching & Duplicate Suppression:**
   - Frontend debounces map dragging events (minimum 500ms debounce before triggering reverse geocode).
   - Coordinates rounded to 4 decimal places (~11 meters precision) to prevent repetitive geocoding requests for tiny movement skews.
5. **Feature Kill-Switch:**
   - Backend flag: `MAPS_ENABLED=true/false` in `.env`.
   - Frontend flag: `VITE_MAPS_ENABLED=true/false` in `.env`.
   - If `MAPS_ENABLED=false` or Google API fails/times out (3-second timeout), the backend cleanly falls back and frontend displays standard manual address input without erroring out.
6. **Google Cloud Quota Controls & Budget Alerts:**
   - Set hard daily cap in GCP console (e.g. 1,000 requests/day).
   - Configure GCP billing alert at $0 and $10 thresholds.

---

## 5. ENVIRONMENT CONFIGURATION (NAMES ONLY)

### Backend (`backend/.env`)
- `MAPS_ENABLED` (boolean, default: `true`)
- `GOOGLE_MAPS_API_KEY` (string, secret)
- `RATE_LIMIT_LOCATION_WINDOW_MS` (number, default: `60000`)
- `RATE_LIMIT_LOCATION_MAX` (number, default: `10`)

### Frontend (`frontend/.env`)
- `VITE_MAPS_ENABLED` (boolean, default: `true`)
- `VITE_GOOGLE_MAPS_API_KEY` (string, optional frontend browser key with HTTP referrer restrictions)

---

## 6. FEATURE FLAG BEHAVIOR
- **When `MAPS_ENABLED=true`:**
  - Donor sees "Use my current location" button and interactive map pin.
  - Reverse geocoding automatically fills the address field.
  - Manual address entry remains fully active as an alternative or override.
- **When `MAPS_ENABLED=false`:**
  - Location button and map widget are hidden or disabled with clear badge.
  - `CreateDonationModal` renders standard text input for `pickupAddress` and optional manual coordinate inputs.
  - Core donation creation flow operates 100% normally without regression.

---

## 7. FILES TO BE MODIFIED / CREATED IN PHASE 2

### Files to CREATE (New):
1. `backend/src/modules/location/routes/location.routes.ts` — Express route for reverse geocoding proxy.
2. `backend/src/modules/location/controllers/location.controller.ts` — Controller handling location proxy.
3. `backend/src/modules/location/services/location.service.ts` — Google Geocoding API HTTP client service with timeout & caching.
4. `backend/src/modules/location/dto/location.dto.ts` — Zod schema for coordinate validation.
5. `frontend/src/components/LocationPickerMap.tsx` — Reusable Google Maps UI component.
6. `frontend/src/services/location.service.ts` — Frontend service wrapping geolocation and backend location proxy.
7. `backend/tests/unit/location.service.test.ts` & `backend/tests/integration/location.api.test.ts` — Location tests.

### Files to MODIFY (Existing):
1. [`backend/src/config/env.ts`](file:///C:/Rudra_Workshop/Food-Management/backend/src/config/env.ts) — Add `MAPS_ENABLED`, `GOOGLE_MAPS_API_KEY`, `RATE_LIMIT_LOCATION_*` to Zod schema.
2. [`backend/src/shared/middleware/rate-limiter.middleware.ts`](file:///C:/Rudra_Workshop/Food-Management/backend/src/shared/middleware/rate-limiter.middleware.ts) — Add `locationRateLimiter`.
3. [`backend/src/app.ts`](file:///C:/Rudra_Workshop/Food-Management/backend/src/app.ts) — Register location routes under `/api/v1/location`.
4. [`frontend/src/modules/donors/components/CreateDonationModal.tsx`](file:///C:/Rudra_Workshop/Food-Management/frontend/src/modules/donors/components/CreateDonationModal.tsx) — Add "Use my location" button & embed map widget.
5. [`frontend/src/modules/donors/components/EditDonationModal.tsx`](file:///C:/Rudra_Workshop/Food-Management/frontend/src/modules/donors/components/EditDonationModal.tsx) — Add location picker support.

### Files that MUST NOT BE TOUCHED:
- `backend/prisma/schema.prisma` (Schema already contains required fields)
- `backend/src/modules/auth-user/*`
- `backend/src/modules/review/*`
- `backend/src/modules/assignment/*`
- `backend/src/modules/pickup/*`
- `backend/src/modules/inventory/*`
- Global rate limiter core rules

---

## 8. DETAILED TESTING STRATEGY

### Unit Tests
- `location.dto.test.ts`: Validate latitude/longitude range rules (-90 to 90, -180 to 180), invalid types.
- `location.service.test.ts`: Test Google API caller with mock Axios responses (success, 429 quota error, timeout, zero results).
- `env.test.ts`: Verify default values when `MAPS_ENABLED` is missing or set to `false`.

### Integration & Security Tests
- `POST /api/v1/location/reverse-geocode`:
  - Test 200 OK with valid lat/lng and return formatted address.
  - Test 401 Unauthorized when no JWT token provided.
  - Test 429 Too Many Requests when rate limit exceeded (e.g., 11th request in 1 min).
  - Test 503 Service Unavailable when `MAPS_ENABLED=false`.
  - Test coordinate boundary violations (lat 95.0 -> 400 Bad Request).

### Frontend Tests
- Test "Use my current location" button click fires `navigator.geolocation.getCurrentPosition`.
- Test fallback when user denies permission: displays alert "Location permission denied. Please enter address manually."
- Test manual address entry remains usable regardless of map state.
- Test responsive viewports: 375px, 480px, 640px, 768px, 1024px, 1280px, 1440px.

---

## 9. COST & RISK ANALYSIS

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| Uncontrolled Google API billing | High | Backend proxy with per-user rate limit, GCP daily quota cap, $0 budget alert |
| Browser Geolocation permission denied | Low | Graceful fallback to existing manual address input |
| Google Geocoding API outage / network failure | Medium | 3s timeout on backend proxy call, return fallback error, manual input remains operational |
| Exposed Google API Key | High | Server key kept in backend `.env`; client key locked to domain HTTP Referrer |

---

## PHASE 1 VERDICT

**READY FOR IMPLEMENTATION**
