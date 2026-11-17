import React, { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
} from '@vis.gl/react-google-maps';
import { Crosshair, MapPin } from 'lucide-react';
import {
  ReviewRecord,
  TechnicianRecord,
  computeTechnicianRating,
  haversineKm,
} from '../lib/kenyaData';
import {
  GOOGLE_MAPS_API_KEY,
  KENYA_DEFAULT_CENTER,
  KENYA_DEFAULT_ZOOM,
  MAPS_ATTRIBUTION_IDS,
} from '../lib/mapsConfig';
import { formatKes } from '../lib/validation';

interface TechniciansMapProps {
  technicians: TechnicianRecord[];
  reviews: ReviewRecord[];
  userLocation: { lat: number; lng: number } | null;
  locating: boolean;
  locationError: string | null;
  onRequestLocation: () => void;
  onSelectTech: (tech: TechnicianRecord) => void;
  onBookTech: (tech: TechnicianRecord) => void;
}

type MarkerAnchor = NonNullable<ReturnType<typeof useAdvancedMarkerRef>[1]>;

function TechnicianPin({
  tech,
  isSelected,
  onSelectMarker,
}: {
  tech: TechnicianRecord;
  isSelected: boolean;
  onSelectMarker: (
    tech: TechnicianRecord,
    marker: MarkerAnchor
  ) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: tech.lat, lng: tech.lng }}
      title={`${tech.fullName} — ${tech.trade}`}
      zIndex={isSelected ? 1000 : tech.availableNow ? 10 : 1}
      onClick={() => {
        if (marker) {
          onSelectMarker(tech, marker);
        }
      }}
    >
      <Pin
        background={isSelected ? '#0F172A' : tech.availableNow ? '#047857' : '#64748B'}
        borderColor="#FFFFFF"
        glyphColor="#FFFFFF"
      />
    </AdvancedMarker>
  );
}

function MapCameraSync({
  userLocation,
  focusTech,
}: {
  userLocation: { lat: number; lng: number } | null;
  focusTech: TechnicianRecord | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (userLocation) {
      map.panTo(userLocation);
      map.setZoom(11);
    }
  }, [map, userLocation]);

  useEffect(() => {
    if (!map || !focusTech) return;
    map.panTo({ lat: focusTech.lat, lng: focusTech.lng });
  }, [map, focusTech]);

  return null;
}

export function TechniciansMap({
  technicians,
  reviews,
  userLocation,
  locating,
  locationError,
  onRequestLocation,
  onSelectTech,
  onBookTech,
}: TechniciansMapProps) {
  const [activeTech, setActiveTech] = useState<TechnicianRecord | null>(null);
  const [activeMarker, setActiveMarker] = useState<MarkerAnchor | null>(null);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <MapPin className="w-7 h-7 text-slate-400 mx-auto mb-2" aria-hidden="true" />
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          Google Maps key is loading
        </h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Ensure <code className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code> is available in the environment and reload to view live technician pins.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          {userLocation ? (
            <span>
              Showing distances from your GPS position ({userLocation.lat.toFixed(4)},{' '}
              {userLocation.lng.toFixed(4)})
            </span>
          ) : (
            <span>
              Click a technician pin for details, or enable GPS to see fundis nearest you.
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={locating}
          onClick={onRequestLocation}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
        >
          <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{locating ? 'Locating...' : userLocation ? 'Update My GPS' : 'Use My Location'}</span>
        </button>
      </div>

      {locationError && (
        <div className="px-4 py-2 text-xs text-amber-900 bg-amber-50 border-b border-amber-200">
          {locationError}
        </div>
      )}

      <div className="h-[460px] lg:h-[520px] w-full">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={userLocation || KENYA_DEFAULT_CENTER}
          defaultZoom={userLocation ? 11 : KENYA_DEFAULT_ZOOM}
          gestureHandling="greedy"
          internalUsageAttributionIds={MAPS_ATTRIBUTION_IDS}
          style={{ width: '100%', height: '100%' }}
        >
          <MapCameraSync userLocation={userLocation} focusTech={activeTech} />

          {userLocation && (
            <AdvancedMarker position={userLocation} title="Your current location" zIndex={1200}>
              <Pin background="#1D4ED8" borderColor="#FFFFFF" glyphColor="#FFFFFF" />
            </AdvancedMarker>
          )}

          {technicians.map((tech) => (
            <TechnicianPin
              key={tech.id}
              tech={tech}
              isSelected={activeTech?.id === tech.id}
              onSelectMarker={(t, m) => {
                setActiveTech(t);
                setActiveMarker(m);
              }}
            />
          ))}

          {activeTech && activeMarker && (
            <InfoWindow
              anchor={activeMarker}
              onCloseClick={() => {
                setActiveTech(null);
                setActiveMarker(null);
              }}
            >
              <div className="p-1 max-w-[230px] space-y-2 text-slate-900">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">
                    {activeTech.trade} · {activeTech.county}
                  </p>
                  <h4 className="text-sm font-bold leading-snug">{activeTech.fullName}</h4>
                  <p className="text-xs text-slate-600">{activeTech.town}</p>
                </div>

                {userLocation && (
                  <p className="text-xs font-mono font-medium text-emerald-800">
                    {haversineKm(userLocation, activeTech).toFixed(1)} km from you
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold">
                    {formatKes(activeTech.calloutFeeKes)} callout
                  </span>
                  {(() => {
                    const summary = computeTechnicianRating(activeTech, reviews);
                    return (
                      <span className="font-mono text-slate-700">
                        {summary.average !== null
                          ? `${summary.average.toFixed(1)}★ (${summary.reviewCount})`
                          : 'New'}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectTech(activeTech)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => onBookTech(activeTech)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded"
                  >
                    Book Fundi
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
