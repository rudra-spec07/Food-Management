# Feature Documentation: Smart Location (Google Maps Demo Key / Free Prototype Mode)

## Overview
Smart Location allows food donors to easily pick up their location using Browser Geolocation and interactive map marker placement. The feature operates in **Prototype/Demo Mode**, utilizing the **Google Maps Platform Demo Key** for client-side rendering and reverse geocoding via `google.maps.Geocoder`.

---

## Architecture Highlights
1. **Zero Billing Requirement**: No Google Cloud billing account or paid subscription is required for prototype testing.
2. **Client-Side Processing**:
   - **Coordinates Acquisition**: Browser native Geolocation API (`navigator.geolocation.getCurrentPosition`).
   - **Interactive Map**: Google Maps JavaScript API.
   - **Reverse Geocoding**: Client-side `google.maps.Geocoder()` converts coordinates directly to human-readable street addresses inside the user's browser.
3. **Frontend Application Rate Limiting**: Client-side rate limiter enforces application-level quota protection (`VITE_LOCATION_GEOCODE_MAX` requests per `VITE_LOCATION_GEOCODE_WINDOW_MS`).
4. **No Backend Location Key Required**: No server-side API keys (`GOOGLE_GEOCODING_API_KEY`) or backend proxy routes are used.
5. **No Places Autocomplete**: Keeps implementation lightweight without extra billing-dependent APIs (Places, Routes, Address Validation).
6. **Resilient Manual Fallback**: Manual address entry is fully functional and supported at all times.

---

## Configuration

### Enabling Smart Location
Add the following settings to `frontend/.env`:

```env
VITE_MAPS_ENABLED=true
VITE_GOOGLE_MAPS_PLATFORM_KEY=YOUR_DEMO_KEY
VITE_LOCATION_GEOCODE_WINDOW_MS=60000
VITE_LOCATION_GEOCODE_MAX=10
```

> **Note**: A single frontend key `VITE_GOOGLE_MAPS_PLATFORM_KEY` powers both map rendering and client-side reverse geocoding.

### Disabling Smart Location
Set the feature flag in `frontend/.env`:

```env
VITE_MAPS_ENABLED=false
```

When disabled:
- Google Maps JavaScript API script will not load.
- Map preview is hidden.
- Donor flow defaults gracefully to manual pickup address entry.

---

## Frontend Rate Limiting & Quota Protection
Reverse geocoding is protected at the application layer by a client-side sliding window rate limiter (`locationService`):
- **Default Limit**: Maximum 10 reverse-geocode operations per 60 seconds (`VITE_LOCATION_GEOCODE_WINDOW_MS=60000`, `VITE_LOCATION_GEOCODE_MAX=10`).
- **Explicit User Triggering Only**: Reverse geocoding triggers ONLY on "Use my current location" button click or marker `dragend`.
- **Keystroke / Render Protection**: Keystrokes in address fields, React renders, map renders, or marker drag movements do NOT consume rate limit quota or trigger API requests.
- **In-Memory Cache**: Near-identical coordinates (within ~11 meters tolerance) re-use cached addresses immediately without consuming rate limit quota or making duplicate Google API calls.
- **Request Deduplication**: Concurrent requests for identical coordinates wait for the active pending request.
- **Graceful Fallback**: When the rate limit is reached, a friendly message is displayed (`"Location lookup limit reached. Please enter the address manually or try again shortly."`) while preserving the manual address input.

---

## Security Model & Rate Limiter Boundaries

> [!IMPORTANT]
> **Frontend Rate Limiting Scope & Limitations**:
> The frontend client-side rate limiter is an **application quality / accidental abuse protection mechanism**. Because the Google Maps Demo Key is a browser-facing public credential, a malicious user could inspect client-side JavaScript and invoke third-party APIs directly.
>
> Therefore, defense-in-depth is structured as follows:
> - **Frontend Location Limiter**: Protects normal user interaction from accidental duplicate queries or runaway client loops.
> - **Google Provider Quota**: Provider-enforced daily/per-minute usage limits on the Demo Key protect against excessive provider usage.
> - **Backend Global API Rate Limiter**: `globalRateLimiter` remains active on all `/api/v1/*` backend endpoints to safeguard application database and server resources.

---

## Production Migration Path
For full production deployment with high volume:
1. Create a production Google Cloud project with billing enabled.
2. Generate a standard Google Maps JavaScript API key.
3. Restrict the key by HTTP Referrers (your production domain).
4. Update `VITE_GOOGLE_MAPS_PLATFORM_KEY` in production environment settings.
