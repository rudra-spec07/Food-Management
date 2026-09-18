# FEATURE: Smart Location Demo Key / Free Prototype Mode Migration Plan

## A. Current Smart Location Architecture

The existing Smart Location implementation operates as follows:
1. **Frontend UI Integration**:
   - `CreateDonationModal` & `EditDonationModal` contain a "Use my current location" button that triggers `navigator.geolocation.getCurrentPosition()`.
   - `LocationPickerMap` dynamically loads the Google Maps JavaScript API using `loadGoogleMapsScript(apiKey)` with `VITE_GOOGLE_MAPS_BROWSER_API_KEY`.
   - When coordinates are set, `LocationPickerMap` displays an interactive map with a draggable marker.
   - On geolocation success or marker `dragend`, the modals invoke `locationService.reverseGeocode(lat, lng)`.
2. **Backend Proxy & Geocoding Provider**:
   - `frontend/src/services/location.service.ts` sends an HTTP POST request to backend `/api/v1/location/reverse-geocode`.
   - Backend `location.routes.ts` enforces authentication (`authenticate`) and rate limiting (`locationRateLimiter` max 10 req/min).
   - Backend `location.controller.ts` validates coordinates via `reverseGeocodeSchema`.
   - Backend `location.service.ts` performs a server-to-server HTTP fetch call to Google Maps Geocoding API (`https://maps.googleapis.com/maps/api/geocode/json?latlng=...&key=...`) using `GOOGLE_GEOCODING_API_KEY`.
3. **Database & Schema**:
   - `pickupAddress`, `pickupLatitude`, `pickupLongitude` on `Donation` model.

---

## B. Files Involved

### Backend Files
- `backend/src/modules/location/controllers/location.controller.ts`
- `backend/src/modules/location/dto/location.dto.ts`
- `backend/src/modules/location/routes/location.routes.ts`
- `backend/src/modules/location/services/location.service.ts`
- `backend/src/config/env.ts`
- `backend/src/shared/middleware/rate-limiter.middleware.ts`
- `backend/src/app.ts`
- `backend/.env`
- `backend/.env.example`
- `backend/tests/unit/location.service.test.ts`
- `backend/tests/integration/location.routes.test.ts`

### Frontend Files
- `frontend/src/components/LocationPickerMap.tsx`
- `frontend/src/services/location.service.ts`
- `frontend/src/modules/donors/components/CreateDonationModal.tsx`
- `frontend/src/modules/donors/components/EditDonationModal.tsx`
- `frontend/.env`
- `frontend/.env.example`
- `frontend/src/test/location.feature.test.tsx`

---

## C. Current Billing-Dependent Parts

1. **Backend Geocoding Server API Key**:
   - `GOOGLE_GEOCODING_API_KEY` in `backend/.env` and `backend/src/config/env.ts`.
   - Server-side fetch to `https://maps.googleapis.com/maps/api/geocode/json` requires a Google Cloud project with billing activated.
2. **Frontend Script Loader API Key Variable**:
   - `VITE_GOOGLE_MAPS_BROWSER_API_KEY` in `frontend/.env`.

---

## D. Proposed Demo Key Architecture

```
Browser Geolocation API (navigator.geolocation)
        ↓
    (lat, lng)
        ↓
Google Maps JavaScript API (loaded via VITE_GOOGLE_MAPS_PLATFORM_KEY)
        ↓
Client-Side google.maps.Geocoder()
        ↓
Formatted Address String
        ↓
Existing Donation Form State (pickupAddress, pickupLatitude, pickupLongitude)
```

1. **Client-Side Direct Geocoding**:
   - Reverse geocoding executes directly in browser using `google.maps.Geocoder`.
   - Eliminates backend server-to-server API requests to Google Geocoding API.
2. **Demo Key / Prototype Mode**:
   - Uses `VITE_GOOGLE_MAPS_PLATFORM_KEY` in `frontend/.env`.
   - Eliminates `GOOGLE_GEOCODING_API_KEY` and Google Cloud billing requirement.
3. **Backend Simplification**:
   - Remove obsolete backend reverse-geocode module (`backend/src/modules/location`), backend route registration in `app.ts`, `GOOGLE_GEOCODING_API_KEY`, `locationRateLimiter`, and `RATE_LIMIT_LOCATION_*` environment variables.

---

## E. Files to Modify

1. `frontend/.env` & `frontend/.env.example`:
   - Rename `VITE_GOOGLE_MAPS_BROWSER_API_KEY` to `VITE_GOOGLE_MAPS_PLATFORM_KEY`.
2. `frontend/src/components/LocationPickerMap.tsx`:
   - Update environment variable reference to `VITE_GOOGLE_MAPS_PLATFORM_KEY`.
3. `frontend/src/services/location.service.ts`:
   - Re-implement `locationService.reverseGeocode(latitude, longitude)` using client-side `google.maps.Geocoder()`.
   - Add client-side quota protection, caching/tolerance checks, and in-flight request deduplication.
4. `backend/src/config/env.ts`:
   - Remove `GOOGLE_GEOCODING_API_KEY`, `RATE_LIMIT_LOCATION_WINDOW_MS`, `RATE_LIMIT_LOCATION_MAX`, and `MAPS_ENABLED` (if no other backend features depend on backend location).
5. `backend/src/shared/middleware/rate-limiter.middleware.ts`:
   - Remove unused `locationRateLimiter`.
6. `backend/src/app.ts`:
   - Remove `locationRoutes` import and endpoint mounting (`/api/v1/location`).
7. `backend/.env` & `backend/.env.example`:
   - Remove `GOOGLE_GEOCODING_API_KEY`, `MAPS_ENABLED` (from backend).
8. `frontend/src/test/location.feature.test.tsx`:
   - Update tests to mock client-side `google.maps.Geocoder` reverse geocoding instead of `apiClient.post`.

---

## F. Files to Safely Remove / Deprecate

The following backend location files are exclusively used by the obsolete backend proxy endpoint and can be cleanly removed:
- `backend/src/modules/location/controllers/location.controller.ts`
- `backend/src/modules/location/dto/location.dto.ts`
- `backend/src/modules/location/routes/location.routes.ts`
- `backend/src/modules/location/services/location.service.ts`
- `backend/tests/unit/location.service.test.ts`
- `backend/tests/integration/location.routes.test.ts`

---

## G. Environment Variable Changes

### Frontend
- **Add/Update**: `VITE_GOOGLE_MAPS_PLATFORM_KEY` (e.g. `VITE_GOOGLE_MAPS_PLATFORM_KEY=YOUR_DEMO_KEY`)
- **Keep**: `VITE_MAPS_ENABLED=true`
- **Remove/Replace**: `VITE_GOOGLE_MAPS_BROWSER_API_KEY`

### Backend
- **Remove**: `GOOGLE_GEOCODING_API_KEY`
- **Remove**: `RATE_LIMIT_LOCATION_WINDOW_MS`
- **Remove**: `RATE_LIMIT_LOCATION_MAX`
- **Remove**: `MAPS_ENABLED` (backend-only)

---

## H. Security Implications

1. `VITE_GOOGLE_MAPS_PLATFORM_KEY` is a browser-facing public credential by design for Google Maps JS API prototypes.
2. No backend secrets, Gemini keys, or database credentials are exposed to the frontend.
3. `frontend/.env` remains strictly gitignored (`.env.example` uses placeholder values).
4. No API keys are logged, stored in database, or transmitted to backend.

---

## I. Rate & Quota Protection

To prevent quota exhaustion on the Demo Key:
1. **Explicit Triggering**: Reverse geocoding runs ONLY on explicit user clicks ("Use my current location") or marker `dragend` events.
2. **No Automatic Typing/Render Geocoding**: Keystrokes in address input or marker position movements (without `dragend`) NEVER trigger reverse geocoding.
3. **In-flight Deduplication**: If a reverse-geocode request is already pending, subsequent trigger attempts return/wait for the active request.
4. **Coordinate Cache / Tolerance**: If identical or near-identical coordinates (within ~0.0001 degrees latitude/longitude) are queried within a session, return cached address without API call.
5. **Graceful Fallback**: Quota limits or network errors output friendly messages (e.g., "Map location service is temporarily unavailable. Please enter the pickup address manually.") without crashing the donation form.

---

## J. Test Plan

1. **Frontend Tests (`frontend/src/test/location.feature.test.tsx`)**:
   - Verify `locationService.reverseGeocode` returns address using mock `google.maps.Geocoder`.
   - Verify error handling on `ZERO_RESULTS`, `OVER_QUERY_LIMIT`, or missing SDK.
   - Verify `LocationPickerMap` handles `VITE_MAPS_ENABLED=false` and missing key gracefully.
2. **Backend Regression Tests**:
   - Run `npm test` in `backend` to ensure all remaining module tests (auth, donation, review, pickup, inventory, etc.) pass clean with zero errors.
3. **Verification Commands**:
   - Frontend: `npm run check` (typecheck), `npm run test`, `npm run build`
   - Backend: `npm run build`, `npm test`

---

## K. Rollback Plan

If compatibility or unexpected client-side issues occur:
1. Restore backend `location` module files from git state.
2. Restore `GOOGLE_GEOCODING_API_KEY` configuration.
3. Re-mount `/api/v1/location` routes in `backend/src/app.ts`.
4. Restore `location.service.ts` in frontend to send POST requests to backend proxy.
