import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  height?: string;
}

declare global {
  interface Window {
    google?: any;
    initGoogleMapsPromise?: Promise<void>;
  }
}

const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  if (window.google && window.google.maps) {
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

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  latitude,
  longitude,
  onMarkerDragEnd,
  height = '220px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  const isMapsEnabled = import.meta.env.VITE_MAPS_ENABLED !== 'false';
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_PLATFORM_KEY || '';

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!isMapsEnabled || !apiKey.trim()) {
      setLoadError(true);
      return;
    }

    let isMounted = true;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (isMounted) setMapLoaded(true);
      })
      .catch(() => {
        if (isMounted) setLoadError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [isMapsEnabled, apiKey]);

  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !window.google?.maps) return;

    const mapOptions = {
      center: { lat: latitude, lng: longitude },
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, mapOptions);
    } else {
      mapInstanceRef.current.setCenter({ lat: latitude, lng: longitude });
    }

    if (!markerInstanceRef.current) {
      markerInstanceRef.current = new window.google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: mapInstanceRef.current,
        draggable: Boolean(onMarkerDragEnd),
        animation: window.google.maps.Animation.DROP,
      });

      if (onMarkerDragEnd) {
        markerInstanceRef.current.addListener('dragend', () => {
          const pos = markerInstanceRef.current.getPosition();
          if (pos) {
            onMarkerDragEnd(pos.lat(), pos.lng());
          }
        });
      }
    } else {
      markerInstanceRef.current.setPosition({ lat: latitude, lng: longitude });
    }
  }, [mapLoaded, latitude, longitude, onMarkerDragEnd]);

  if (!isMapsEnabled) {
    return null;
  }

  if (loadError || !apiKey.trim()) {
    return (
      <div
        style={{
          height,
          width: '100%',
          backgroundColor: '#f8fafc',
          border: '1px dashed #cbd5e1',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          textAlign: 'center',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--foodshare-green-dark)', fontWeight: 600 }}>
          <MapPin size={20} />
          <span>Selected Location Pin</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          (Interactive map preview disabled or API key unconfigured; manual address remains active)
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        position: 'relative',
      }}
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      {!mapLoaded && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
            gap: '8px',
          }}
        >
          <span className="spinner" style={{ borderTopColor: 'var(--foodshare-green-primary)' }} />
          <span>Loading Interactive Map...</span>
        </div>
      )}
    </div>
  );
};
