export interface ReverseGeocodeResult {
  address: string;
  latitude: number;
  longitude: number;
}

interface CacheEntry {
  latitude: number;
  longitude: number;
  address: string;
  timestamp: number;
}

// In-memory cache for recent reverse geocode lookups
const geocodeCache: CacheEntry[] = [];
const COORD_TOLERANCE = 0.0001;

// In-flight request deduplication map
const pendingRequests = new Map<string, Promise<ReverseGeocodeResult>>();

// Frontend Client-Side Rate Limiter timestamps
const requestTimestamps: number[] = [];

const getKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  if (window.google && window.google.maps && window.google.maps.Geocoder) {
    return Promise.resolve();
  }
  if (window.initGoogleMapsPromise) {
    return window.initGoogleMapsPromise;
  }

  window.initGoogleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (err) => reject(err));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });

  return window.initGoogleMapsPromise;
};

export const locationService = {
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    const isMapsEnabled = import.meta.env.VITE_MAPS_ENABLED !== 'false';
    if (!isMapsEnabled) {
      console.warn('[SmartLocation Diagnostic] Smart Location features are disabled via VITE_MAPS_ENABLED');
      throw new Error('Smart Location features are currently disabled.');
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || '';
    if (!apiKey.trim()) {
      console.warn('[SmartLocation Diagnostic] VITE_GOOGLE_MAPS_PLATFORM_KEY is missing or empty');
      throw new Error('Location service API key is missing. Please enter address manually.');
    }

    // 1. Check cache for matching or near-identical coordinates
    const cached = geocodeCache.find(
      (entry) =>
        Math.abs(entry.latitude - latitude) < COORD_TOLERANCE &&
        Math.abs(entry.longitude - longitude) < COORD_TOLERANCE
    );
    if (cached) {
      console.log('[SmartLocation Diagnostic] Reverse geocode served from CACHE:', { latitude, longitude, address: cached.address });
      return {
        address: cached.address,
        latitude,
        longitude,
      };
    }

    // 2. Check for pending in-flight request
    const cacheKey = getKey(latitude, longitude);
    if (pendingRequests.has(cacheKey)) {
      console.log('[SmartLocation Diagnostic] Reverse geocode served from IN-FLIGHT DEDUPLICATION:', { latitude, longitude });
      return pendingRequests.get(cacheKey)!;
    }

    // 3. Frontend Client-Side Rate Limiting Check
    const windowMs = Number(import.meta.env.VITE_LOCATION_GEOCODE_WINDOW_MS) || 60000;
    const maxRequests = Number(import.meta.env.VITE_LOCATION_GEOCODE_MAX) || 10;
    const now = Date.now();

    // Clean up timestamps outside the active window
    while (requestTimestamps.length > 0 && requestTimestamps[0] <= now - windowMs) {
      requestTimestamps.shift();
    }

    if (requestTimestamps.length >= maxRequests) {
      console.warn('[SmartLocation Diagnostic] Reverse geocode BLOCKED by FRONTEND RATE LIMITER:', {
        requestTimestampsCount: requestTimestamps.length,
        maxRequests,
        windowMs,
        latitude,
        longitude,
      });
      throw new Error('Location lookup limit reached. Please enter the address manually or try again shortly.');
    }

    // Record attempt timestamp for rate limiting
    requestTimestamps.push(now);

    console.log('[SmartLocation Diagnostic] Initiating Google Geocoder reverseGeocode request:', { latitude, longitude });

    const requestPromise = (async () => {
      try {
        await loadGoogleMapsScript(apiKey);

        if (!window.google?.maps?.Geocoder) {
          console.error('[SmartLocation Diagnostic] google.maps.Geocoder is NOT available on window.google.maps');
          throw new Error('Google Maps Geocoder is not available.');
        }

        const geocoder = new window.google.maps.Geocoder();
        const response = await new Promise<any>((resolve, reject) => {
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: any) => {
            console.log('[SmartLocation Diagnostic] google.maps.Geocoder callback response:', { status, resultsCount: results?.length, results });
            if (status === 'OK' && results && results[0]) {
              resolve(results[0]);
            } else {
              reject({ status, results });
            }
          });
        });

        const address = response.formatted_address;
        if (!address) {
          throw new Error('No readable address string returned from location provider.');
        }

        geocodeCache.push({
          latitude,
          longitude,
          address,
          timestamp: Date.now(),
        });
        if (geocodeCache.length > 50) {
          geocodeCache.shift();
        }

        return {
          address,
          latitude,
          longitude,
        };
      } catch (err: any) {
        console.error('[SmartLocation Diagnostic] Reverse geocode FAILED:', {
          latitude,
          longitude,
          status: err?.status,
          message: err?.message,
          rawError: err,
        });
        if (err?.status === 'ZERO_RESULTS') {
          throw new Error('Your location was detected, but no matching street address was found. Please enter the address manually.');
        }
        if (err?.status === 'REQUEST_DENIED') {
          throw new Error("Your location was detected, but we couldn't automatically find the pickup address. Please enter the address manually.");
        }
        if (err?.status === 'OVER_QUERY_LIMIT') {
          throw new Error('Location lookup limit reached. Please enter the address manually or try again shortly.');
        }
        if (err?.message) {
          throw new Error(err.message);
        }
        throw new Error('Your location was detected. Please enter the pickup address manually.');
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  },

  _resetState(): void {
    requestTimestamps.length = 0;
    geocodeCache.length = 0;
    pendingRequests.clear();
  },
};
