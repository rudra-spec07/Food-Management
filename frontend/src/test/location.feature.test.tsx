import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { locationService } from '../services/location.service';

describe('Frontend Location Service Tests (Client-Side Geocoder & Rate Limiter)', () => {
  const originalGoogle = (window as any).google;

  beforeEach(() => {
    vi.clearAllMocks();
    locationService._resetState();
  });

  afterEach(() => {
    (window as any).google = originalGoogle;
    locationService._resetState();
  });

  it('1. First reverse-geocode request succeeds', async () => {
    const mockGeocode = vi.fn((_req, callback) => {
      callback([{ formatted_address: '789 Palasia, Indore, MP, India' }], 'OK');
    });

    (window as any).google = {
      maps: {
        Geocoder: vi.fn().mockImplementation(() => ({
          geocode: mockGeocode,
        })),
      },
    };

    const result = await locationService.reverseGeocode(22.7196, 75.8577);

    expect(result.address).toBe('789 Palasia, Indore, MP, India');
    expect(result.latitude).toBe(22.7196);
    expect(result.longitude).toBe(75.8577);
  });

  it('2. Requests within configured limit succeed and request exceeding limit is blocked', async () => {
    const mockGeocode = vi.fn((_req, callback) => {
      callback([{ formatted_address: 'Address' }], 'OK');
    });

    (window as any).google = {
      maps: {
        Geocoder: vi.fn().mockImplementation(() => ({
          geocode: mockGeocode,
        })),
      },
    };

    for (let i = 0; i < 9; i++) {
      const lat = 10 + i * 0.1;
      const lng = 20 + i * 0.1;
      const res = await locationService.reverseGeocode(lat, lng);
      expect(res.address).toBe('Address');
    }

    const res10 = await locationService.reverseGeocode(15.0, 25.0);
    expect(res10.address).toBe('Address');

    await expect(locationService.reverseGeocode(16.0, 26.0)).rejects.toThrow(
      'Location lookup limit reached. Please enter the address manually or try again shortly.'
    );

    expect(mockGeocode).toHaveBeenCalledTimes(10);
  });

  it('3. Limiter resets after the configured window', async () => {
    vi.useFakeTimers();

    const mockGeocode = vi.fn((_req, callback) => {
      callback([{ formatted_address: 'Address' }], 'OK');
    });

    (window as any).google = {
      maps: {
        Geocoder: vi.fn().mockImplementation(() => ({
          geocode: mockGeocode,
        })),
      },
    };

    for (let i = 0; i < 10; i++) {
      await locationService.reverseGeocode(30 + i * 0.1, 40 + i * 0.1);
    }

    await expect(locationService.reverseGeocode(35.0, 45.0)).rejects.toThrow(
      'Location lookup limit reached. Please enter the address manually or try again shortly.'
    );

    vi.advanceTimersByTime(60001);

    const resAfterReset = await locationService.reverseGeocode(35.0, 45.0);
    expect(resAfterReset.address).toBe('Address');

    vi.useRealTimers();
  });

  it('4. Duplicate in-flight request is suppressed', async () => {
    let callbackRef: any = null;
    const mockGeocode = vi.fn((_req, callback) => {
      callbackRef = callback;
    });

    (window as any).google = {
      maps: {
        Geocoder: vi.fn().mockImplementation(() => ({
          geocode: mockGeocode,
        })),
      },
    };

    const p1 = locationService.reverseGeocode(50.0, 60.0);
    const p2 = locationService.reverseGeocode(50.0, 60.0);

    // Yield to microtasks so loadGoogleMapsScript resolves and geocode() is invoked
    await Promise.resolve();

    expect(mockGeocode).toHaveBeenCalledTimes(1);

    callbackRef([{ formatted_address: 'Shared Address' }], 'OK');

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.address).toBe('Shared Address');
    expect(r2.address).toBe('Shared Address');
  });

  it('5. Cached/near-identical coordinates do not create extra requests or consume rate limit', async () => {
    const mockGeocode = vi.fn((_req, callback) => {
      callback([{ formatted_address: 'Cached Location Address' }], 'OK');
    });

    (window as any).google = {
      maps: {
        Geocoder: vi.fn().mockImplementation(() => ({
          geocode: mockGeocode,
        })),
      },
    };

    const res1 = await locationService.reverseGeocode(40.7128, -74.006);
    const res2 = await locationService.reverseGeocode(40.712801, -74.006001);

    expect(res1.address).toBe('Cached Location Address');
    expect(res2.address).toBe('Cached Location Address');
    expect(mockGeocode).toHaveBeenCalledTimes(1);
  });

  it('6. REQUEST_DENIED throws friendly error without exposing raw technical status or billing info', async () => {
    const mockGeocode = vi.fn((_req, callback) => {
      callback([], 'REQUEST_DENIED');
    });

    (window as any).google = {
      maps: {
        Geocoder: vi.fn().mockImplementation(() => ({
          geocode: mockGeocode,
        })),
      },
    };

    await expect(locationService.reverseGeocode(22.7196, 75.8577)).rejects.toThrow(
      "Your location was detected, but we couldn't automatically find the pickup address. Please enter the address manually."
    );
  });
});
