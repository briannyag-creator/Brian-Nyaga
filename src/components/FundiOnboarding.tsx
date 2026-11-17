import React, { useEffect, useState } from 'react';
import { useFundi } from '../context/FirebaseContext';
import {
  KENYA_COUNTIES,
  PHOTO_OPTIONS,
  TRADES,
  TradeCategory,
  getCountyCoordinates,
} from '../lib/kenyaData';
import { VALIDATION_LIMITS, isValidKenyanPhone, normalizeKenyanPhone } from '../lib/validation';
import { LocationPickerMap } from './LocationPickerMap';

interface FundiOnboardingProps {
  onOpenAuth: () => void;
}

export function FundiOnboarding({ onOpenAuth }: FundiOnboardingProps) {
  const {
    user,
    isAccountVerified,
    resendVerificationEmail,
    refreshAuthUser,
    myTechnicianProfile,
    upsertTechnicianProfile,
    privateProfile,
    savePrivateProfile,
    fetchFundiSmsSettings,
    saveFundiSmsSettings,
    sendTestFundiSms,
  } = useFundi();

  const [fullName, setFullName] = useState('');
  const [trade, setTrade] = useState<TradeCategory>('Electrical & Solar');
  const [county, setCounty] = useState('Nairobi');
  const [town, setTown] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: -1.2864,
    lng: 36.8172,
  });
  const [serviceRadiusKm, setServiceRadiusKm] = useState(40);
  const [calloutFeeKes, setCalloutFeeKes] = useState(1200);
  const [hourlyRateKes, setHourlyRateKes] = useState(1000);
  const [experienceYears, setExperienceYears] = useState(5);
  const [certification, setCertification] = useState('');
  const [bio, setBio] = useState('');
  const [languagesText, setLanguagesText] = useState('English, Swahili');
  const [availableNow, setAvailableNow] = useState(true);
  const [remoteSupport, setRemoteSupport] = useState(true);
  const [photoUrl, setPhotoUrl] = useState(PHOTO_OPTIONS[0].url);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(true);
  const [gatewayProvider, setGatewayProvider] = useState<string | null>(null);
  const [testingSms, setTestingSms] = useState(false);
  const [testSmsFeedback, setTestSmsFeedback] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (myTechnicianProfile) {
      setFullName(myTechnicianProfile.fullName);
      setTrade(myTechnicianProfile.trade);
      setCounty(myTechnicianProfile.county);
      setTown(myTechnicianProfile.town);
      setCoords({ lat: myTechnicianProfile.lat, lng: myTechnicianProfile.lng });
      setServiceRadiusKm(myTechnicianProfile.serviceRadiusKm);
      setCalloutFeeKes(myTechnicianProfile.calloutFeeKes);
      setHourlyRateKes(myTechnicianProfile.hourlyRateKes);
      setExperienceYears(myTechnicianProfile.experienceYears);
      setCertification(myTechnicianProfile.certification);
      setBio(myTechnicianProfile.bio);
      setLanguagesText(myTechnicianProfile.languages.join(', '));
      setAvailableNow(myTechnicianProfile.availableNow);
      setRemoteSupport(myTechnicianProfile.remoteSupport);
      setPhotoUrl(myTechnicianProfile.photoUrl || PHOTO_OPTIONS[0].url);
    } else if (user) {
      setFullName(user.displayName || '');
    }
    if (privateProfile?.mpesaPhone || user?.phoneNumber) {
      setMpesaPhone(privateProfile?.mpesaPhone || user?.phoneNumber || '');
    }
  }, [myTechnicianProfile, user, privateProfile]);

  useEffect(() => {
    if (!user || !isAccountVerified) return;
    let active = true;
    fetchFundiSmsSettings()
      .then((settings) => {
        if (!active) return;
        setSmsAlertsEnabled(settings.enabled);
        setGatewayProvider(settings.gatewayProvider);
        if (settings.phoneE164 && !mpesaPhone) {
          setMpesaPhone(settings.phoneE164);
        }
      })
      .catch(() => {
        // ignore if server unreachable
      });
    return () => {
      active = false;
    };
  }, [user, isAccountVerified]);

  if (!user) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-10 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Register as a vetted Kenyan Fundi
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6">
            Publish your trade credentials, GPS base location, counties served, and KES callout rates to appear on the map and receive direct dispatch bookings.
          </p>
          <button
            type="button"
            onClick={onOpenAuth}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
          >
            Sign in or Create Account
          </button>
        </div>
      </section>
    );
  }

  if (!isAccountVerified) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-amber-200 rounded-xl p-8 space-y-4">
          <h1 className="text-xl font-bold text-slate-900">
            Verify your email address to publish a Fundi profile
          </h1>
          <p className="text-sm text-slate-600">
            Open the verification link sent to <span className="font-semibold">{user.email}</span>, then click below to continue.
          </p>
          {feedback && (
            <p className="text-xs font-medium text-emerald-800">{feedback.text}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                const ok = await refreshAuthUser();
                if (!ok) {
                  setFeedback({
                    type: 'err',
                    text: 'Email is not verified yet. Please click the link in your inbox.',
                  });
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              I Have Verified — Refresh
            </button>
            <button
              type="button"
              onClick={async () => {
                await resendVerificationEmail();
                setFeedback({ type: 'ok', text: 'Verification link resent.' });
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Resend Verification Email
            </button>
          </div>
        </div>
      </section>
    );
  }

  const handleCountyChange = (nextCounty: string) => {
    setCounty(nextCounty);
    if (!myTechnicianProfile) {
      setCoords(getCountyCoordinates(nextCounty));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (fullName.trim().length < VALIDATION_LIMITS.fullNameMin) {
      setFeedback({ type: 'err', text: 'Enter your full legal or business name.' });
      return;
    }
    if (town.trim().length < VALIDATION_LIMITS.townMin) {
      setFeedback({ type: 'err', text: 'Specify your primary town or service base.' });
      return;
    }
    if (certification.trim().length < VALIDATION_LIMITS.certificationMin) {
      setFeedback({
        type: 'err',
        text: 'Enter your certification or trade license (e.g., EPRA Class C1, NITA Grade I).',
      });
      return;
    }
    if (bio.trim().length < VALIDATION_LIMITS.bioMin) {
      setFeedback({
        type: 'err',
        text: 'Describe your technical specialties in at least 10 characters.',
      });
      return;
    }

    const langs = languagesText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length >= 2)
      .slice(0, 5);

    setSaving(true);
    try {
      const docId = await upsertTechnicianProfile({
        fullName: fullName.trim(),
        trade,
        county,
        town: town.trim(),
        lat: coords.lat,
        lng: coords.lng,
        serviceRadiusKm,
        calloutFeeKes,
        hourlyRateKes,
        experienceYears,
        certification: certification.trim(),
        bio: bio.trim(),
        availableNow,
        remoteSupport,
        languages: langs.length > 0 ? langs : ['Swahili', 'English'],
        photoUrl,
      });

      if (mpesaPhone.trim()) {
        await savePrivateProfile({
          displayName: fullName.trim(),
          email: user.email || '',
          mpesaPhone: mpesaPhone.trim(),
          county,
          town: town.trim(),
          role: 'technician',
        });
      }

      if (mpesaPhone.trim() && isValidKenyanPhone(normalizeKenyanPhone(mpesaPhone))) {
        await saveFundiSmsSettings({
          phone: mpesaPhone.trim(),
          enabled: smsAlertsEnabled,
          technicianId: docId,
        });
      } else if (!smsAlertsEnabled) {
        await saveFundiSmsSettings({
          phone: '',
          enabled: false,
          technicianId: docId,
        });
      }

      setFeedback({
        type: 'ok',
        text: myTechnicianProfile
          ? 'Your public technician listing, map pin, and SMS alert settings have been updated.'
          : 'Your technician profile is now live on the Kenya map and directory.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to save technician profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async () => {
    setTestSmsFeedback(null);
    const cleaned = normalizeKenyanPhone(mpesaPhone);
    if (!isValidKenyanPhone(cleaned)) {
      setTestSmsFeedback('Enter a valid Kenyan mobile number (07XXXXXXXX or +2547XXXXXXXX) first.');
      return;
    }
    setTestingSms(true);
    try {
      await saveFundiSmsSettings({
        phone: cleaned,
        enabled: smsAlertsEnabled,
        technicianId: myTechnicianProfile?.id,
      });
      const res = await sendTestFundiSms({
        phone: cleaned,
        fullName: fullName.trim() || user.displayName || undefined,
      });
      if (res.sent) {
        setTestSmsFeedback(`Test SMS delivered to ${res.phoneE164} via ${res.provider}.`);
      } else {
        setTestSmsFeedback(
          `${res.reason || 'SMS gateway not configured.'} Preview: "${res.previewText}"`
        );
      }
    } catch (err) {
      setTestSmsFeedback(err instanceof Error ? err.message : 'Unable to test SMS alert.');
    } finally {
      setTestingSms(false);
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900">
          {myTechnicianProfile ? 'Manage Your Fundi Profile' : 'Register as a Kenyan Technician'}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Set your base county, map pin, dispatch radius, and transparent KES rates. Personal phone numbers stay private in your encrypted profile.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
      >
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="fundi-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Full Name or Trading Name
            </label>
            <input
              id="fundi-name"
              type="text"
              required
              maxLength={VALIDATION_LIMITS.fullNameMax}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g., Samuel Kiprop Tanui"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="fundi-trade" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary Trade
            </label>
            <select
              id="fundi-trade"
              value={trade}
              onChange={(e) => setTrade(e.target.value as TradeCategory)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {TRADES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          <div>
            <label htmlFor="fundi-county" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Base County
            </label>
            <select
              id="fundi-county"
              value={county}
              onChange={(e) => handleCountyChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {KENYA_COUNTIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="fundi-town" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Base Town / Area
            </label>
            <input
              id="fundi-town"
              type="text"
              required
              maxLength={VALIDATION_LIMITS.townMax}
              value={town}
              onChange={(e) => setTown(e.target.value)}
              placeholder="e.g., Eldoret CBD"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="fundi-radius" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Coverage Radius (km)
            </label>
            <input
              id="fundi-radius"
              type="number"
              min={VALIDATION_LIMITS.serviceRadiusMin}
              max={VALIDATION_LIMITS.serviceRadiusMax}
              value={serviceRadiusKm}
              onChange={(e) => setServiceRadiusKm(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
        </div>

        <LocationPickerMap
          lat={coords.lat}
          lng={coords.lng}
          onChange={setCoords}
          label="Pin Your Workshop or Dispatch Base on Google Maps"
        />

        <div className="grid sm:grid-cols-3 gap-5">
          <div>
            <label htmlFor="fundi-callout" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Callout Fee (KES)
            </label>
            <input
              id="fundi-callout"
              type="number"
              min={VALIDATION_LIMITS.calloutFeeMin}
              max={VALIDATION_LIMITS.calloutFeeMax}
              value={calloutFeeKes}
              onChange={(e) => setCalloutFeeKes(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="fundi-hourly" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hourly Rate (KES)
            </label>
            <input
              id="fundi-hourly"
              type="number"
              min={VALIDATION_LIMITS.hourlyRateMin}
              max={VALIDATION_LIMITS.hourlyRateMax}
              value={hourlyRateKes}
              onChange={(e) => setHourlyRateKes(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="fundi-exp" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Years Experience
            </label>
            <input
              id="fundi-exp"
              type="number"
              min={0}
              max={60}
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="fundi-cert" className="block text-xs font-semibold text-slate-700 mb-1.5">
              License / Certification (EPRA, NCA, NITA)
            </label>
            <input
              id="fundi-cert"
              type="text"
              required
              maxLength={VALIDATION_LIMITS.certificationMax}
              value={certification}
              onChange={(e) => setCertification(e.target.value)}
              placeholder="e.g., EPRA Class C1 & Solar T3"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="fundi-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Private SMS Alert & M-Pesa Phone (Hidden from Public)
            </label>
            <input
              id="fundi-phone"
              type="tel"
              maxLength={20}
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.target.value)}
              placeholder="0712345678 or +254712345678"
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
        </div>

        {/* Instant Booking SMS Alert Configuration */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Instant Booking SMS Text Alerts
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Receive an immediate SMS prompt with the client’s name, phone, county, and Google Maps pin whenever you are booked.
                {gatewayProvider ? ` Gateway active: ${gatewayProvider}.` : ''}
              </p>
            </div>
            <button
              type="button"
              disabled={testingSms}
              onClick={() => void handleTestSms()}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap self-start"
            >
              {testingSms ? 'Sending...' : 'Send Test SMS'}
            </button>
          </div>

          <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={smsAlertsEnabled}
              onChange={(e) => setSmsAlertsEnabled(e.target.checked)}
              className="w-4 h-4 accent-emerald-700 rounded"
            />
            <span>Send prompt SMS text message when a customer books me</span>
          </label>

          {testSmsFeedback && (
            <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-3">
              {testSmsFeedback}
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="fundi-langs" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Languages Spoken (comma separated)
            </label>
            <input
              id="fundi-langs"
              type="text"
              value={languagesText}
              onChange={(e) => setLanguagesText(e.target.value)}
              placeholder="English, Swahili, Kalenjin"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="fundi-photo" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Work Profile Image
            </label>
            <select
              id="fundi-photo"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {PHOTO_OPTIONS.map((opt) => (
                <option key={opt.url} value={opt.url}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="fundi-bio" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Technical Bio & Equipment Carried
          </label>
          <textarea
            id="fundi-bio"
            rows={3}
            required
            maxLength={VALIDATION_LIMITS.bioMax}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Describe your specialties, diagnostic tools carried, and towns covered..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </div>

        <div className="flex flex-wrap gap-6 pt-1">
          <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={availableNow}
              onChange={(e) => setAvailableNow(e.target.checked)}
              className="w-4 h-4 accent-emerald-700 rounded"
            />
            <span>Available for same-day dispatch</span>
          </label>

          <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={remoteSupport}
              onChange={(e) => setRemoteSupport(e.target.checked)}
              className="w-4 h-4 accent-emerald-700 rounded"
            />
            <span>Offer remote video triage anywhere in Kenya</span>
          </label>
        </div>

        {feedback && (
          <div
            role="status"
            className={`p-3.5 text-xs font-medium rounded-lg border ${
              feedback.type === 'ok'
                ? 'text-emerald-900 bg-emerald-50 border-emerald-200'
                : 'text-red-800 bg-red-50 border-red-200'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors"
          >
            {saving
              ? 'Publishing...'
              : myTechnicianProfile
                ? 'Update Fundi Profile'
                : 'Publish Fundi Profile'}
          </button>
        </div>
      </form>
    </section>
  );
}
