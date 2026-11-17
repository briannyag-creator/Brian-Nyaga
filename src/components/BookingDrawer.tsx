import React, { useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { useFundi } from '../context/FirebaseContext';
import {
  KENYA_COUNTIES,
  TechnicianRecord,
  getCountyCoordinates,
} from '../lib/kenyaData';
import {
  VALIDATION_LIMITS,
  formatKes,
  isValidKenyanPhone,
  normalizeKenyanPhone,
} from '../lib/validation';
import { LocationPickerMap } from './LocationPickerMap';

interface BookingDrawerProps {
  technician: TechnicianRecord | null;
  defaultCounty: string;
  userLocation: { lat: number; lng: number } | null;
  onRequireAuth: () => void;
  onClose: () => void;
  onSuccess: () => void;
}

export function BookingDrawer({
  technician,
  defaultCounty,
  userLocation,
  onRequireAuth,
  onClose,
  onSuccess,
}: BookingDrawerProps) {
  const { user, isAccountVerified, privateProfile, createBooking, lastBookingSmsNotice } =
    useFundi();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [county, setCounty] = useState(defaultCounty !== 'All' ? defaultCounty : 'Nairobi');
  const [town, setTown] = useState('');
  const [estateLandmark, setEstateLandmark] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: -1.2864,
    lng: 36.8172,
  });
  const [serviceMode, setServiceMode] = useState<'onsite' | 'remote_triage'>('onsite');
  const [urgency, setUrgency] = useState<'emergency' | 'scheduled'>('emergency');
  const [scheduledDate, setScheduledDate] = useState('Today, Next Available');
  const [issueDescription, setIssueDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (!technician) return;
    setCreatedId(null);
    setErrorMsg(null);
    setCustomerName(privateProfile?.displayName || user?.displayName || '');
    setCustomerPhone(privateProfile?.mpesaPhone || user?.phoneNumber || '');
    const initialCounty =
      defaultCounty !== 'All'
        ? defaultCounty
        : privateProfile?.county || technician.county || 'Nairobi';
    setCounty(initialCounty);
    setTown(privateProfile?.town || '');
    setCoords(userLocation || getCountyCoordinates(initialCounty));
    if (!technician.remoteSupport) {
      setServiceMode('onsite');
    }
  }, [technician, user, privateProfile, defaultCounty, userLocation]);

  if (!technician) return null;

  const estimatedCalloutKes =
    serviceMode === 'remote_triage'
      ? Math.max(500, Math.round(technician.calloutFeeKes * 0.5))
      : technician.calloutFeeKes;

  const handleCountyChange = (nextCounty: string) => {
    setCounty(nextCounty);
    if (!userLocation) {
      setCoords(getCountyCoordinates(nextCounty));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (customerName.trim().length < VALIDATION_LIMITS.fullNameMin) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    const cleanPhone = normalizeKenyanPhone(customerPhone);
    if (!isValidKenyanPhone(cleanPhone)) {
      setErrorMsg('Enter a valid Kenyan mobile number (e.g., 0712345678 or +254712345678).');
      return;
    }
    if (town.trim().length < VALIDATION_LIMITS.townMin) {
      setErrorMsg('Enter your town or sub-county (e.g., Kilimani, Nyali, Eldoret).');
      return;
    }
    if (estateLandmark.trim().length < VALIDATION_LIMITS.estateLandmarkMin) {
      setErrorMsg('Enter an estate, road, or landmark for the technician.');
      return;
    }
    if (issueDescription.trim().length < VALIDATION_LIMITS.issueDescriptionMin) {
      setErrorMsg('Describe the fault or installation needed (at least 10 characters).');
      return;
    }

    if (!user) {
      onRequireAuth();
      return;
    }
    if (!isAccountVerified) {
      setErrorMsg('Please verify your email address using the link sent to your inbox before submitting a dispatch request.');
      return;
    }

    setSubmitting(true);
    try {
      const id = await createBooking({
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        technicianId: technician.id,
        technicianOwnerUid: technician.ownerUid,
        technicianName: technician.fullName,
        trade: technician.trade,
        county,
        town: town.trim(),
        estateLandmark: estateLandmark.trim(),
        lat: coords.lat,
        lng: coords.lng,
        issueDescription: issueDescription.trim(),
        serviceMode,
        urgency,
        scheduledDate: urgency === 'emergency' ? 'Today, Immediate' : scheduledDate.trim(),
        estimatedCalloutKes,
      });
      setCreatedId(id);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to complete booking request. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-drawer-title"
    >
      <div className="bg-white w-full max-w-lg h-full overflow-y-auto border-l border-slate-200 flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 z-10">
          <div>
            <p className="text-xs text-slate-500">Dispatch Request · {technician.trade}</p>
            <h2 id="booking-drawer-title" className="text-lg font-bold text-slate-900">
              Book {technician.fullName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking drawer"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdId ? (
          <div className="p-6 flex-1 flex flex-col justify-center">
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-6 space-y-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-700" aria-hidden="true" />
              <h3 className="text-lg font-bold text-slate-900">
                Dispatch request confirmed
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                Your job request for <span className="font-semibold">{technician.fullName}</span>{' '}
                in <span className="font-semibold">{town}, {county}</span> has been pinned and recorded.
              </p>
              <div className="text-xs font-mono text-slate-600 pt-2 border-t border-emerald-200 space-y-1">
                <div>Reference: {createdId}</div>
                <div>
                  Location Pin: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </div>
                <div>Callout Estimate: {formatKes(estimatedCalloutKes)}</div>
                <div>M-Pesa Paybill: 522533 · Account: {createdId.slice(0, 12).toUpperCase()}</div>
              </div>
              {lastBookingSmsNotice && (
                <div className="text-xs bg-white border border-emerald-200 rounded-lg p-3 space-y-1.5">
                  <div className="font-semibold text-slate-900">
                    {lastBookingSmsNotice.sent
                      ? `Instant SMS dispatch prompt sent via ${lastBookingSmsNotice.provider}`
                      : 'Technician Dispatch Notification'}
                  </div>
                  {!lastBookingSmsNotice.sent && lastBookingSmsNotice.reason && (
                    <p className="text-slate-600">{lastBookingSmsNotice.reason}</p>
                  )}
                  <p className="text-[11px] font-mono text-slate-500 break-words">
                    {lastBookingSmsNotice.previewText}
                  </p>
                </div>
              )}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSuccess();
                  }}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                >
                  Track in My Bookings
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Service Mode
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setServiceMode('onsite')}
                  className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                    serviceMode === 'onsite'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Onsite Visit ({formatKes(technician.calloutFeeKes)})
                </button>
                <button
                  type="button"
                  disabled={!technician.remoteSupport}
                  onClick={() => setServiceMode('remote_triage')}
                  className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors disabled:opacity-40 ${
                    serviceMode === 'remote_triage'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Video Triage ({formatKes(Math.max(500, Math.round(technician.calloutFeeKes * 0.5)))})
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Dispatch Timing
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setUrgency('emergency')}
                  className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                    urgency === 'emergency'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Urgent / Same-Day
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('scheduled')}
                  className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                    urgency === 'scheduled'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Schedule Date
                </button>
              </div>
            </div>

            {urgency === 'scheduled' && (
              <div>
                <label
                  htmlFor="booking-date"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Preferred Date & Time Window
                </label>
                <input
                  id="booking-date"
                  type="text"
                  maxLength={40}
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  placeholder="e.g., Tomorrow 10:00 AM"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="booking-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Your Name
                </label>
                <input
                  id="booking-name"
                  type="text"
                  required
                  maxLength={VALIDATION_LIMITS.fullNameMax}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g., Mercy Njeri"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
              <div>
                <label
                  htmlFor="booking-phone"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Kenyan Mobile (M-Pesa)
                </label>
                <input
                  id="booking-phone"
                  type="tel"
                  required
                  maxLength={20}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0712345678 or +2547..."
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="booking-county"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  County (All 47 Covered)
                </label>
                <select
                  id="booking-county"
                  value={county}
                  onChange={(e) => handleCountyChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                >
                  {KENYA_COUNTIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="booking-town"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Town / Sub-County
                </label>
                <input
                  id="booking-town"
                  type="text"
                  required
                  maxLength={VALIDATION_LIMITS.townMax}
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  placeholder="e.g., Kilimani, Nyali, Eldoret"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="booking-landmark"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Estate, Road or Landmark
              </label>
              <input
                id="booking-landmark"
                type="text"
                required
                maxLength={VALIDATION_LIMITS.estateLandmarkMax}
                value={estateLandmark}
                onChange={(e) => setEstateLandmark(e.target.value)}
                placeholder="e.g., Argwings Kodhek Rd, Gate 14B near Yaya Centre"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <LocationPickerMap
              lat={coords.lat}
              lng={coords.lng}
              onChange={setCoords}
              label="Pin Service Request Location on Map"
            />

            <div>
              <label
                htmlFor="booking-issue"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Describe the Technical Issue
              </label>
              <textarea
                id="booking-issue"
                rows={3}
                required
                maxLength={VALIDATION_LIMITS.issueDescriptionMax}
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="e.g., Hybrid solar inverter showing fault code F08 after power surge."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between font-medium text-slate-900">
                <span>Estimated Callout / Triage Fee</span>
                <span className="font-mono tabular-nums">{formatKes(estimatedCalloutKes)}</span>
              </div>
              <div className="flex justify-between">
                <span>Standard Labour Rate (if repair exceeds 1st hour)</span>
                <span className="font-mono tabular-nums">
                  {formatKes(technician.hourlyRateKes)}/hr
                </span>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg"
              >
                {errorMsg}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors"
              >
                {submitting
                  ? 'Confirming...'
                  : user
                    ? 'Confirm Dispatch Request'
                    : 'Sign in & Confirm Dispatch'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
