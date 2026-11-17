import React, { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
} from '@vis.gl/react-google-maps';
import { ExternalLink } from 'lucide-react';
import { BookingRecord } from '../lib/kenyaData';
import {
  GOOGLE_MAPS_API_KEY,
  KENYA_DEFAULT_CENTER,
  MAPS_ATTRIBUTION_IDS,
} from '../lib/mapsConfig';

interface ServiceRequestMapProps {
  bookings: BookingRecord[];
  selectedBookingId: string | null;
  onSelectBooking: (bookingId: string) => void;
}

type MarkerAnchor = NonNullable<ReturnType<typeof useAdvancedMarkerRef>[1]>;

function RequestMarker({
  booking,
  isSelected,
  onSelectMarker,
}: {
  booking: BookingRecord;
  isSelected: boolean;
  onSelectMarker: (
    booking: BookingRecord,
    marker: MarkerAnchor
  ) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  const pinColor =
    booking.status === 'completed'
      ? '#047857'
      : booking.status === 'cancelled'
        ? '#94A3B8'
        : booking.urgency === 'emergency'
          ? '#B91C1C'
          : '#B45309';

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: booking.lat, lng: booking.lng }}
      title={`${booking.town}, ${booking.county} — ${booking.customerName}`}
      zIndex={isSelected ? 1000 : 10}
      onClick={() => {
        if (marker) {
          onSelectMarker(booking, marker);
        }
      }}
    >
      <Pin background={pinColor} borderColor="#FFFFFF" glyphColor="#FFFFFF" />
    </AdvancedMarker>
  );
}

function FocusBookingCamera({ booking }: { booking: BookingRecord | undefined }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !booking) return;
    map.panTo({ lat: booking.lat, lng: booking.lng });
    map.setZoom(13);
  }, [map, booking]);

  return null;
}

export function ServiceRequestMap({
  bookings,
  selectedBookingId,
  onSelectBooking,
}: ServiceRequestMapProps) {
  const [activeMarker, setActiveMarker] = useState<MarkerAnchor | null>(null);
  const [infoOpenForId, setInfoOpenForId] = useState<string | null>(null);

  if (!GOOGLE_MAPS_API_KEY || bookings.length === 0) {
    return null;
  }

  const focusedBooking =
    bookings.find((b) => b.id === selectedBookingId) || bookings[0];
  const infoBooking = bookings.find((b) => b.id === infoOpenForId) || null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Service Request Locations
          </h2>
          <p className="text-xs text-slate-500">
            Click any request pin to inspect the site landmark and open driving directions.
          </p>
        </div>
        <span className="text-xs font-mono text-slate-600 tabular-nums">
          {bookings.length} pinned {bookings.length === 1 ? 'request' : 'requests'}
        </span>
      </div>

      <div className="h-[340px] w-full">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={
            focusedBooking
              ? { lat: focusedBooking.lat, lng: focusedBooking.lng }
              : KENYA_DEFAULT_CENTER
          }
          defaultZoom={focusedBooking ? 11 : 7}
          gestureHandling="greedy"
          internalUsageAttributionIds={MAPS_ATTRIBUTION_IDS}
          style={{ width: '100%', height: '100%' }}
        >
          <FocusBookingCamera booking={bookings.find((b) => b.id === selectedBookingId)} />

          {bookings.map((b) => (
            <RequestMarker
              key={b.id}
              booking={b}
              isSelected={b.id === selectedBookingId}
              onSelectMarker={(booking, marker) => {
                onSelectBooking(booking.id);
                setActiveMarker(marker);
                setInfoOpenForId(booking.id);
              }}
            />
          ))}

          {infoBooking && activeMarker && (
            <InfoWindow
              anchor={activeMarker}
              onCloseClick={() => setInfoOpenForId(null)}
            >
              <div className="p-1 max-w-[230px] space-y-1.5 text-slate-900">
                <p className="text-[11px] font-medium text-slate-500">
                  {infoBooking.county} County · {infoBooking.town}
                </p>
                <h4 className="text-sm font-bold">{infoBooking.customerName}</h4>
                <p className="text-xs text-slate-600">{infoBooking.estateLandmark}</p>
                <p className="text-xs text-slate-700 line-clamp-2">
                  {infoBooking.issueDescription}
                </p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${infoBooking.lat},${infoBooking.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline pt-1"
                >
                  <span>Open Directions</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
