import React, { useEffect, useMemo, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Search, MapPin, ArrowRight, Crosshair } from 'lucide-react';
import { useFundi } from './context/FirebaseContext';
import { ActiveView, TopBar } from './components/TopBar';
import { TechnicianCard } from './components/TechnicianCard';
import { TechnicianModal } from './components/TechnicianModal';
import { BookingDrawer } from './components/BookingDrawer';
import { BookingsDashboard } from './components/BookingsDashboard';
import { FundiOnboarding } from './components/FundiOnboarding';
import { TechniciansMap } from './components/TechniciansMap';
import { AuthModal } from './components/AuthModal';
import { CustomerAssistantBot } from './components/CustomerAssistantBot';
import {
  KENYA_COUNTIES,
  KENYA_REGIONS,
  TRADES,
  TechnicianRecord,
  computeTechnicianRating,
  haversineKm,
} from './lib/kenyaData';
import { GOOGLE_MAPS_API_KEY } from './lib/mapsConfig';

export default function App() {
  const {
    user,
    isAccountVerified,
    resendVerificationEmail,
    refreshAuthUser,
    technicians,
    techniciansLoading,
    reviews,
    customerBookings,
    incomingJobs,
    authError,
  } = useFundi();

  const [activeView, setActiveView] = useState<ActiveView>('directory');
  const [directoryDisplay, setDirectoryDisplay] = useState<'grid' | 'map'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCounty, setSelectedCounty] = useState<string>('All');
  const [selectedTrade, setSelectedTrade] = useState<string>('All');
  const [onlyAvailableNow, setOnlyAvailableNow] = useState(false);
  const [onlyRemoteTriage, setOnlyRemoteTriage] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'rating'>('default');
  const [activeRegionTab, setActiveRegionTab] = useState(KENYA_REGIONS[0].region);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [detailTech, setDetailTech] = useState<TechnicianRecord | null>(null);
  const [bookingTech, setBookingTech] = useState<TechnicianRecord | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Browser geolocation is unavailable on this device.');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        });
        setLocating(false);
      },
      () => {
        setLocationError(
          'Location permission was denied. Enable browser location or filter by County below.'
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleNavigate = (view: ActiveView, sectionId?: string) => {
    setActiveView(view);
    if (sectionId) {
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filteredTechnicians = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = technicians.filter((tech) => {
      if (selectedCounty !== 'All') {
        const countyMatches = tech.county === selectedCounty;
        if (!countyMatches && !(onlyRemoteTriage && tech.remoteSupport)) {
          return false;
        }
      }
      if (selectedTrade !== 'All' && tech.trade !== selectedTrade) return false;
      if (onlyAvailableNow && !tech.availableNow) return false;
      if (onlyRemoteTriage && !tech.remoteSupport) return false;
      if (q) {
        const hay = `${tech.fullName} ${tech.trade} ${tech.county} ${tech.town} ${tech.certification} ${tech.bio}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'rating') {
      return [...list].sort((a, b) => {
        const ra = computeTechnicianRating(a, reviews);
        const rb = computeTechnicianRating(b, reviews);
        const scoreDiff = (rb.average ?? 0) - (ra.average ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
        return rb.reviewCount - ra.reviewCount;
      });
    }

    if (userLocation) {
      return [...list].sort(
        (a, b) => haversineKm(userLocation, a) - haversineKm(userLocation, b)
      );
    }
    return list;
  }, [
    technicians,
    reviews,
    searchQuery,
    selectedCounty,
    selectedTrade,
    onlyAvailableNow,
    onlyRemoteTriage,
    sortBy,
    userLocation,
  ]);

  const activeRegion =
    KENYA_REGIONS.find((r) => r.region === activeRegionTab) || KENYA_REGIONS[0];

  const totalBookingBadge = customerBookings.length + incomingJobs.length;

  const content = (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <TopBar
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenAuth={() => setAuthModalOpen(true)}
        bookingCount={totalBookingBadge}
      />

      {user && !isAccountVerified && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-950 px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <span>
              Verify your email ({user.email}) to confirm bookings and publish technician profiles.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void resendVerificationEmail()}
                className="font-semibold underline hover:text-amber-800"
              >
                Resend link
              </button>
              <button
                type="button"
                onClick={() => void refreshAuthUser()}
                className="px-2.5 py-1 bg-amber-900 text-white rounded font-semibold"
              >
                Refresh status
              </button>
            </div>
          </div>
        </div>
      )}

      {authError && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          <div className="p-3 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg">
            {authError}
          </div>
        </div>
      )}

      <main className="flex-1">
        {activeView === 'bookings' ? (
          <BookingsDashboard
            onBrowseDirectory={() => handleNavigate('directory', 'directory-section')}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        ) : activeView === 'fundi-portal' ? (
          <FundiOnboarding onOpenAuth={() => setAuthModalOpen(true)} />
        ) : (
          <>
            {/* Split Hero Section */}
            <section className="bg-white border-b border-slate-200">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
                <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                  <div className="lg:col-span-6 flex flex-col justify-center">
                    <p className="text-xs font-medium text-emerald-800 mb-3">
                      All 47 Kenyan Counties · GPS Map Dispatch & Video Triage
                    </p>
                    <h1 className="text-[clamp(2.25rem,4vw,3.4rem)] font-bold tracking-tight text-slate-900 leading-[1.1] text-balance mb-4">
                      Trusted Kenyan technicians, dispatched anywhere you are.
                    </h1>
                    <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-7">
                      Locate nearby EPRA electricians, NCA plumbers, borehole engineers, HVAC technicians, auto mechatronics, and fiber specialists on a live map from your current location across Kenya.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDirectoryDisplay('map');
                          handleRequestLocation();
                          handleNavigate('directory', 'directory-section');
                        }}
                        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <Crosshair className="w-4 h-4" aria-hidden="true" />
                        <span>Find Nearest Fundis on Map</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNavigate('directory', 'directory-section')}
                        className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <span>Browse Directory</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="relative h-full min-h-[260px] lg:min-h-[380px] rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      {!heroImgFailed ? (
                        <img
                          src="/src/assets/images/hero_kenyan_technician_1794914798524.jpg"
                          alt="Kenyan electrical and solar technician inspecting a hybrid inverter on a Nairobi rooftop"
                          referrerPolicy="no-referrer"
                          onError={() => setHeroImgFailed(true)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 text-sm p-8">
                          Nationwide Kenyan Technical Dispatch Network
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-5 text-white">
                        <p className="text-xs text-white/80">Nairobi Metro · EPRA Solar & Electrical</p>
                        <p className="text-sm font-semibold">
                          Live GPS technician discovery & pinned request routing
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full-Width 4-Column Proof & Quick-Stat Strip Below Hero */}
                <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                      47 Counties
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      GPS map pins & regional dispatch hubs
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                      KES 1,200
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Median transparent inspection callout
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                      7 Trades
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      EPRA, NCA & NITA credentialed specialists
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                      M-Pesa Paybill
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Pay directly after verified inspection
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Directory Search, Map & Filter Section */}
            <section id="directory-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Technician Directory & Live Map
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {userLocation
                      ? 'Sorted by nearest distance from your current GPS position.'
                      : 'Filter by Kenyan county, trade discipline, or enable GPS to see technicians nearest you.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-mono text-slate-600 tabular-nums">
                    {filteredTechnicians.length} of {technicians.length} fundis
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSortBy((prev) => (prev === 'rating' ? 'default' : 'rating'))
                    }
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      sortBy === 'rating'
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {sortBy === 'rating' ? 'Sorted: Top Rated' : 'Sort: Top Rated'}
                  </button>
                  <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDirectoryDisplay('grid')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        directoryDisplay === 'grid'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Grid View
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectoryDisplay('map')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        directoryDisplay === 'map'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Map View
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-4 relative">
                    <Search
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      aria-label="Search technicians by skill, town, or name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search solar inverter, borehole, Nyali..."
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div className="md:col-span-3 relative">
                    <MapPin
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <select
                      aria-label="Filter by Kenyan County"
                      value={selectedCounty}
                      onChange={(e) => setSelectedCounty(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    >
                      <option value="All">All 47 Kenyan Counties</option>
                      {KENYA_COUNTIES.map((c) => (
                        <option key={c} value={c}>
                          {c} County
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-5 flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <button
                      type="button"
                      disabled={locating}
                      onClick={handleRequestLocation}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                        userLocation
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>
                        {locating
                          ? 'Locating...'
                          : userLocation
                            ? 'GPS Active'
                            : 'Near Me'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnlyAvailableNow((v) => !v)}
                      className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                        onlyAvailableNow
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Available Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnlyRemoteTriage((v) => !v)}
                      className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                        onlyRemoteTriage
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Video Triage
                    </button>
                  </div>
                </div>

                {locationError && directoryDisplay === 'grid' && (
                  <p className="text-xs text-amber-800">{locationError}</p>
                )}

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTrade('All')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      selectedTrade === 'All'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All Trades
                  </button>
                  {TRADES.map((trade) => (
                    <button
                      key={trade}
                      type="button"
                      onClick={() => setSelectedTrade(trade)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        selectedTrade === trade
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {trade}
                    </button>
                  ))}
                </div>
              </div>

              {directoryDisplay === 'map' ? (
                <TechniciansMap
                  technicians={filteredTechnicians}
                  reviews={reviews}
                  userLocation={userLocation}
                  locating={locating}
                  locationError={locationError}
                  onRequestLocation={handleRequestLocation}
                  onSelectTech={setDetailTech}
                  onBookTech={setBookingTech}
                />
              ) : techniciansLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="h-96 bg-white border border-slate-200 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredTechnicians.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                  <h3 className="text-base font-semibold text-slate-900 mb-1">
                    No onsite technician registered in {selectedCounty} for this filter yet
                  </h3>
                  <p className="text-sm text-slate-600 max-w-lg mx-auto mb-5">
                    You can still access immediate diagnostic support from anywhere in Kenya via Remote Video Triage, or reset filters to view nearby regional hubs.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOnlyRemoteTriage(true);
                        setSelectedCounty('All');
                      }}
                      className="px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                    >
                      Show Remote Video Triage Fundis
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCounty('All');
                        setSelectedTrade('All');
                        setOnlyAvailableNow(false);
                        setOnlyRemoteTriage(false);
                      }}
                      className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTechnicians.map((tech) => (
                    <TechnicianCard
                      key={tech.id}
                      technician={tech}
                      reviews={reviews}
                      distanceKm={userLocation ? haversineKm(userLocation, tech) : null}
                      onSelect={setDetailTech}
                      onBook={setBookingTech}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Nationwide County Access Matrix */}
            <section
              id="counties-section"
              className="bg-white border-t border-b border-slate-200 py-12"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Nationwide Dispatch Hubs
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Select a region and town below to jump straight to verified technicians or remote triage coverage.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {KENYA_REGIONS.map((reg) => (
                    <button
                      key={reg.region}
                      type="button"
                      onClick={() => setActiveRegionTab(reg.region)}
                      className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        activeRegionTab === reg.region
                          ? 'bg-emerald-700 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {reg.region}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {activeRegion.hubs.map((hub) => (
                    <button
                      key={hub.town}
                      type="button"
                      onClick={() => {
                        setSelectedCounty(hub.county);
                        setOnlyRemoteTriage(false);
                        handleNavigate('directory', 'directory-section');
                      }}
                      className="text-left p-5 bg-[#F8F9FA] hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                    >
                      <div className="text-xs text-slate-500 mb-1">
                        {hub.county} County
                      </div>
                      <div className="text-base font-semibold text-slate-900 mb-2">
                        {hub.town}
                      </div>
                      <div className="text-xs font-mono text-emerald-800">
                        Dispatch ETA: {hub.dispatchEta}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2 text-xs text-slate-500">
                  Counties in {activeRegion.region}: {activeRegion.counties.join(' · ')}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-900">FundiLink Kenya</span> · Nationwide technician access across all 47 counties.
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => handleNavigate('directory', 'directory-section')}
              className="hover:text-slate-900"
            >
              Browse Fundis
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('bookings')}
              className="hover:text-slate-900"
            >
              Track Dispatches
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('fundi-portal')}
              className="hover:text-slate-900"
            >
              Join Network
            </button>
          </div>
        </div>
      </footer>

      <TechnicianModal
        technician={detailTech}
        reviews={reviews}
        onClose={() => setDetailTech(null)}
        onBook={(tech) => setBookingTech(tech)}
      />

      <BookingDrawer
        technician={bookingTech}
        defaultCounty={selectedCounty}
        userLocation={userLocation}
        onRequireAuth={() => setAuthModalOpen(true)}
        onClose={() => setBookingTech(null)}
        onSuccess={() => handleNavigate('bookings')}
      />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <CustomerAssistantBot
        technicians={technicians}
        reviews={reviews}
        selectedCounty={selectedCounty}
        userLocation={userLocation}
        onApplyTradeFilter={(trade) => {
          if (TRADES.includes(trade as (typeof TRADES)[number])) {
            setSelectedTrade(trade);
            handleNavigate('directory', 'directory-section');
          }
        }}
        onViewTechnician={(tech) => setDetailTech(tech)}
        onBookTechnician={(tech) => setBookingTech(tech)}
      />
    </div>
  );

  if (GOOGLE_MAPS_API_KEY) {
    return (
      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        libraries={['marker']}
        language="en"
        region="KE"
      >
        {content}
      </APIProvider>
    );
  }

  return content;
}
