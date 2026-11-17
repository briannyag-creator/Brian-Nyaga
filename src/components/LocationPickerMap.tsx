import React, { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import { Crosshair } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, MAPS_ATTRIBUTION_IDS } from '../lib/mapsConfig';

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onChange: (coords: { lat: number; lng: number }) => void;
  label?: string;
}

function PanToCoords({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo({ lat, lng });
  }, [map, lat, lng]);

  return null;
}

export function LocationPickerMap({
  lat,
  lng,
  onChange,
  label = 'Exact Service Pin',
}: LocationPickerMapProps) {
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGeoErr('Browser geolocation is unavailable on this device.');
      return;
    }
    setLocating(true);
    setGeoErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        });
        setLocating(false);
      },
      () => {
        setGeoErr('Location access was denied. Click on the map below to set your pin.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <button
          type="button"
          disabled={locating}
          onClick={handleUseGps}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
        >
          <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{locating ? 'Locating...' : 'Pin My GPS'}</span>
        </button>
      </div>

      {geoErr && <p className="text-xs text-amber-800">{geoErr}</p>}

      {GOOGLE_MAPS_API_KEY ? (
        <div className="h-48 w-full rounded-lg overflow-hidden border border-slate-300">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={{ lat, lng }}
            defaultZoom={12}
            gestureHandling="greedy"
            internalUsageAttributionIds={MAPS_ATTRIBUTION_IDS}
            onClick={(ev) => {
              const ll = ev.detail.latLng;
              if (ll) {
                onChange({
                  lat: Number(ll.lat.toFixed(5)),
                  lng: Number(ll.lng.toFixed(5)),
                });
              }
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <PanToCoords lat={lat} lng={lng} />
            <AdvancedMarker position={{ lat, lng }} title="Selected pin location">
              <Pin background="#047857" borderColor="#FFFFFF" glyphColor="#FFFFFF" />
            </AdvancedMarker>
          </GoogleMap>
        </div>
      ) : null}

      <p className="text-[11px] font-mono text-slate-500 tabular-nums">
        Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)} (click map to adjust)
      </p>
    </div>
  );
}
