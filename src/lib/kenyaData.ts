export const TRADES = [
  'Electrical & Solar',
  'Plumbing & Borehole',
  'Refrigeration & AC',
  'Automotive Diagnostics',
  'ICT & Fiber',
  'Appliance Repair',
  'Welding & Masonry',
] as const;

export type TradeCategory = (typeof TRADES)[number];

export const KENYA_COUNTIES: readonly string[] = [
  'Baringo',
  'Bomet',
  'Bungoma',
  'Busia',
  'Elgeyo-Marakwet',
  'Embu',
  'Garissa',
  'Homa Bay',
  'Isiolo',
  'Kajiado',
  'Kakamega',
  'Kericho',
  'Kiambu',
  'Kilifi',
  'Kirinyaga',
  'Kisii',
  'Kisumu',
  'Kitui',
  'Kwale',
  'Laikipia',
  'Lamu',
  'Machakos',
  'Makueni',
  'Mandera',
  'Marsabit',
  'Meru',
  'Migori',
  'Mombasa',
  "Murang'a",
  'Nairobi',
  'Nakuru',
  'Nandi',
  'Narok',
  'Nyamira',
  'Nyandarua',
  'Nyeri',
  'Samburu',
  'Siaya',
  'Taita-Taveta',
  'Tana River',
  'Tharaka-Nithi',
  'Trans Nzoia',
  'Turkana',
  'Uasin Gishu',
  'Vihiga',
  'Wajir',
  'West Pokot',
] as const;

export const COUNTY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Baringo: { lat: 0.4667, lng: 35.9667 },
  Bomet: { lat: -0.7813, lng: 35.3416 },
  Bungoma: { lat: 0.5635, lng: 34.5606 },
  Busia: { lat: 0.4608, lng: 34.1115 },
  'Elgeyo-Marakwet': { lat: 0.6703, lng: 35.5081 },
  Embu: { lat: -0.5389, lng: 37.4583 },
  Garissa: { lat: -0.4536, lng: 39.6401 },
  'Homa Bay': { lat: -0.5273, lng: 34.4571 },
  Isiolo: { lat: 0.3546, lng: 37.5822 },
  Kajiado: { lat: -1.8524, lng: 36.7768 },
  Kakamega: { lat: 0.2827, lng: 34.7519 },
  Kericho: { lat: -0.3677, lng: 35.2831 },
  Kiambu: { lat: -1.1714, lng: 36.8356 },
  Kilifi: { lat: -3.6305, lng: 39.8499 },
  Kirinyaga: { lat: -0.4989, lng: 37.2803 },
  Kisii: { lat: -0.6817, lng: 34.7667 },
  Kisumu: { lat: -0.0917, lng: 34.768 },
  Kitui: { lat: -1.367, lng: 38.0106 },
  Kwale: { lat: -4.1737, lng: 39.4521 },
  Laikipia: { lat: 0.0167, lng: 37.0667 },
  Lamu: { lat: -2.2717, lng: 40.902 },
  Machakos: { lat: -1.5177, lng: 37.2634 },
  Makueni: { lat: -1.8041, lng: 37.6203 },
  Mandera: { lat: 3.9366, lng: 41.867 },
  Marsabit: { lat: 2.3347, lng: 37.9942 },
  Meru: { lat: 0.0463, lng: 37.6559 },
  Migori: { lat: -1.0634, lng: 34.4731 },
  Mombasa: { lat: -4.0435, lng: 39.6682 },
  "Murang'a": { lat: -0.7167, lng: 37.15 },
  Nairobi: { lat: -1.2864, lng: 36.8172 },
  Nakuru: { lat: -0.2833, lng: 36.0667 },
  Nandi: { lat: 0.2039, lng: 35.105 },
  Narok: { lat: -1.0808, lng: 35.8711 },
  Nyamira: { lat: -0.5633, lng: 34.9358 },
  Nyandarua: { lat: -0.55, lng: 36.3833 },
  Nyeri: { lat: -0.4246, lng: 36.951 },
  Samburu: { lat: 1.0967, lng: 36.6981 },
  Siaya: { lat: 0.0612, lng: 34.2881 },
  'Taita-Taveta': { lat: -3.3961, lng: 38.5561 },
  'Tana River': { lat: -1.5, lng: 40.0333 },
  'Tharaka-Nithi': { lat: -0.2962, lng: 37.7239 },
  'Trans Nzoia': { lat: 1.0157, lng: 35.0062 },
  Turkana: { lat: 3.1167, lng: 35.6 },
  'Uasin Gishu': { lat: 0.5143, lng: 35.2698 },
  Vihiga: { lat: 0.0833, lng: 34.7167 },
  Wajir: { lat: 1.7471, lng: 40.0573 },
  'West Pokot': { lat: 1.2389, lng: 35.1119 },
};

export function getCountyCoordinates(county: string): { lat: number; lng: number } {
  return COUNTY_COORDINATES[county] || { lat: -1.2864, lng: 36.8172 };
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export interface RegionHub {
  region: string;
  counties: string[];
  hubs: { town: string; county: string; dispatchEta: string }[];
}

export const KENYA_REGIONS: RegionHub[] = [
  {
    region: 'Nairobi Metro',
    counties: ['Nairobi', 'Kiambu', 'Kajiado', 'Machakos'],
    hubs: [
      { town: 'Westlands & Kilimani', county: 'Nairobi', dispatchEta: '30–45 mins' },
      { town: 'Karen & Langata', county: 'Nairobi', dispatchEta: '40–55 mins' },
      { town: 'Thika & Ruiru', county: 'Kiambu', dispatchEta: '45–60 mins' },
      { town: 'Ongata Rongai & Kitengela', county: 'Kajiado', dispatchEta: '45–70 mins' },
      { town: 'Syokimau & Athi River', county: 'Machakos', dispatchEta: '45–65 mins' },
    ],
  },
  {
    region: 'Coast',
    counties: ['Mombasa', 'Kilifi', 'Kwale', 'Taita-Taveta', 'Lamu', 'Tana River'],
    hubs: [
      { town: 'Nyali & Mombasa CBD', county: 'Mombasa', dispatchEta: '35–50 mins' },
      { town: 'Diani & Ukunda', county: 'Kwale', dispatchEta: '50–75 mins' },
      { town: 'Kilifi & Malindi', county: 'Kilifi', dispatchEta: '55–80 mins' },
      { town: 'Voi & Taveta', county: 'Taita-Taveta', dispatchEta: '60–90 mins' },
    ],
  },
  {
    region: 'Rift Valley',
    counties: [
      'Nakuru',
      'Uasin Gishu',
      'Kericho',
      'Narok',
      'Laikipia',
      'Trans Nzoia',
      'Nandi',
      'Baringo',
      'Bomet',
      'Elgeyo-Marakwet',
      'Samburu',
      'Turkana',
      'West Pokot',
    ],
    hubs: [
      { town: 'Milimani & Nakuru CBD', county: 'Nakuru', dispatchEta: '35–55 mins' },
      { town: 'Naivasha & Gilgil', county: 'Nakuru', dispatchEta: '45–70 mins' },
      { town: 'Eldoret & Elgon View', county: 'Uasin Gishu', dispatchEta: '35–55 mins' },
      { town: 'Nanyuki & Nyahururu', county: 'Laikipia', dispatchEta: '50–75 mins' },
      { town: 'Kitale & Kericho', county: 'Trans Nzoia', dispatchEta: '50–80 mins' },
    ],
  },
  {
    region: 'Western & Nyanza',
    counties: [
      'Kisumu',
      'Kisii',
      'Kakamega',
      'Bungoma',
      'Siaya',
      'Homa Bay',
      'Migori',
      'Busia',
      'Nyamira',
      'Vihiga',
    ],
    hubs: [
      { town: 'Milimani & Kondele', county: 'Kisumu', dispatchEta: '35–50 mins' },
      { town: 'Kakamega Town', county: 'Kakamega', dispatchEta: '45–65 mins' },
      { town: 'Kisii CBD', county: 'Kisii', dispatchEta: '45–70 mins' },
      { town: 'Bungoma & Webuye', county: 'Bungoma', dispatchEta: '50–75 mins' },
    ],
  },
  {
    region: 'Central & Mt. Kenya',
    counties: ['Nyeri', "Murang'a", 'Kirinyaga', 'Nyandarua', 'Meru', 'Embu', 'Tharaka-Nithi'],
    hubs: [
      { town: 'Nyeri Town & Karatina', county: 'Nyeri', dispatchEta: '40–60 mins' },
      { town: 'Meru Town & Maua', county: 'Meru', dispatchEta: '45–70 mins' },
      { town: 'Embu & Kerugoya', county: 'Embu', dispatchEta: '45–70 mins' },
      { town: "Murang'a & Kenol", county: "Murang'a", dispatchEta: '45–65 mins' },
    ],
  },
  {
    region: 'Eastern & North',
    counties: ['Kitui', 'Makueni', 'Garissa', 'Isiolo', 'Wajir', 'Mandera', 'Marsabit'],
    hubs: [
      { town: 'Wote & Mtito Andei', county: 'Makueni', dispatchEta: '55–85 mins' },
      { town: 'Kitui & Mwingi', county: 'Kitui', dispatchEta: '55–85 mins' },
      { town: 'Garissa & Isiolo', county: 'Garissa', dispatchEta: '60–90 mins' },
      { town: 'Nationwide Video Triage', county: 'Marsabit', dispatchEta: 'Under 15 mins' },
    ],
  },
];

export interface TechnicianRecord {
  id: string;
  ownerUid: string;
  fullName: string;
  trade: TradeCategory;
  county: string;
  town: string;
  lat: number;
  lng: number;
  serviceRadiusKm: number;
  calloutFeeKes: number;
  hourlyRateKes: number;
  experienceYears: number;
  certification: string;
  bio: string;
  availableNow: boolean;
  remoteSupport: boolean;
  languages: string[];
  photoUrl: string;
  ratingAvg: number;
  jobsCompleted: number;
}

export interface BookingRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  technicianId: string;
  technicianOwnerUid: string;
  technicianName: string;
  trade: string;
  county: string;
  town: string;
  estateLandmark: string;
  lat: number;
  lng: number;
  issueDescription: string;
  serviceMode: 'onsite' | 'remote_triage';
  urgency: 'emergency' | 'scheduled';
  scheduledDate: string;
  estimatedCalloutKes: number;
  mpesaRef: string;
  status: 'requested' | 'accepted' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReviewRecord {
  id: string;
  authorUid: string;
  authorName: string;
  technicianId: string;
  bookingId: string;
  rating: number;
  comment: string;
  createdAt?: unknown;
}

export interface TechnicianRatingSummary {
  average: number | null;
  onPlatformAverage: number | null;
  reviewCount: number;
  totalJobs: number;
  latestReview: ReviewRecord | null;
  distribution: { stars: 5 | 4 | 3 | 2 | 1; count: number }[];
}

export function getReviewTimestampMs(createdAt: unknown): number {
  if (!createdAt) return 0;
  if (typeof createdAt === 'object' && createdAt !== null) {
    const maybeTs = createdAt as { toMillis?: () => number; seconds?: number };
    if (typeof maybeTs.toMillis === 'function') {
      return maybeTs.toMillis();
    }
    if (typeof maybeTs.seconds === 'number') {
      return maybeTs.seconds * 1000;
    }
  }
  if (createdAt instanceof Date) return createdAt.getTime();
  return 0;
}

export function sortReviewsNewest(reviews: ReviewRecord[]): ReviewRecord[] {
  return [...reviews].sort(
    (a, b) => getReviewTimestampMs(b.createdAt) - getReviewTimestampMs(a.createdAt)
  );
}

export function computeTechnicianRating(
  tech: TechnicianRecord,
  allReviews: ReviewRecord[]
): TechnicianRatingSummary {
  const techReviews = sortReviewsNewest(
    allReviews.filter((r) => r.technicianId === tech.id)
  );
  const reviewCount = techReviews.length;
  const totalJobs = tech.jobsCompleted + reviewCount;

  const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of techReviews) {
    const clamped = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    counts[clamped] += 1;
    sum += r.rating;
  }

  const onPlatformAverage = reviewCount > 0 ? Number((sum / reviewCount).toFixed(1)) : null;

  let average: number | null = null;
  if (reviewCount === 0) {
    average = tech.ratingAvg > 0 ? Number(tech.ratingAvg.toFixed(1)) : null;
  } else {
    const baselineWeight = tech.ratingAvg > 0 ? 5 : 0;
    average = Number(
      ((tech.ratingAvg * baselineWeight + sum) / (baselineWeight + reviewCount)).toFixed(1)
    );
  }

  const distribution: { stars: 5 | 4 | 3 | 2 | 1; count: number }[] = [
    { stars: 5, count: counts[5] },
    { stars: 4, count: counts[4] },
    { stars: 3, count: counts[3] },
    { stars: 2, count: counts[2] },
    { stars: 1, count: counts[1] },
  ];

  return {
    average,
    onPlatformAverage,
    reviewCount,
    totalJobs,
    latestReview: techReviews[0] || null,
    distribution,
  };
}

export interface UserPrivateProfile {
  uid: string;
  displayName: string;
  email: string;
  mpesaPhone: string;
  county: string;
  town: string;
  role: 'customer' | 'technician';
}

export const BUILT_IN_TECHNICIANS: TechnicianRecord[] = [
  {
    id: 'tech-kamau-nairobi',
    ownerUid: 'platform_verified',
    fullName: 'David Kamau Njoroge',
    trade: 'Electrical & Solar',
    county: 'Nairobi',
    town: 'Westlands & Kilimani',
    lat: -1.2675,
    lng: 36.812,
    serviceRadiusKm: 45,
    calloutFeeKes: 1500,
    hourlyRateKes: 1200,
    experienceYears: 11,
    certification: 'EPRA Class B & T3 Solar',
    bio: 'Licensed hybrid solar inverter installer, three-phase distribution troubleshooting, and KPLC meter surge protection across Nairobi Metro.',
    availableNow: true,
    remoteSupport: true,
    languages: ['English', 'Swahili', 'Kikuyu'],
    photoUrl: '/src/assets/images/hero_kenyan_technician_1794914798524.jpg',
    ratingAvg: 4.9,
    jobsCompleted: 184,
  },
  {
    id: 'tech-wanjiku-kiambu',
    ownerUid: 'platform_verified',
    fullName: 'Grace Wanjiku Maina',
    trade: 'Plumbing & Borehole',
    county: 'Kiambu',
    town: 'Ruiru & Thika Road',
    lat: -1.1483,
    lng: 36.9605,
    serviceRadiusKm: 55,
    calloutFeeKes: 1200,
    hourlyRateKes: 1000,
    experienceYears: 9,
    certification: 'NCA Class 6 Water & Piping',
    bio: 'Borehole submersible pump diagnostics, solar water heater pressure balancing, PEX manifold retrofits, and concealed leak detection.',
    availableNow: true,
    remoteSupport: true,
    languages: ['English', 'Swahili', 'Kikuyu'],
    photoUrl: '/src/assets/images/tech_plumbing_borehole_1794914799187.jpg',
    ratingAvg: 4.9,
    jobsCompleted: 142,
  },
  {
    id: 'tech-omondi-kisumu',
    ownerUid: 'platform_verified',
    fullName: 'Brian Omondi Otieno',
    trade: 'ICT & Fiber',
    county: 'Kisumu',
    town: 'Milimani & Kondele',
    lat: -0.0917,
    lng: 34.768,
    serviceRadiusKm: 75,
    calloutFeeKes: 1200,
    hourlyRateKes: 1100,
    experienceYears: 8,
    certification: 'MikroTik MTCNA & Fiber Splicing',
    bio: 'Fiber optic termination, Starlink & Safaricom enterprise router configuration, Ubiquiti point-to-point links, and CCTV NVR setups across Nyanza.',
    availableNow: true,
    remoteSupport: true,
    languages: ['English', 'Swahili', 'Luo'],
    photoUrl: '/src/assets/images/tech_ict_fiber_1794914798737.jpg',
    ratingAvg: 4.8,
    jobsCompleted: 116,
  },
  {
    id: 'tech-mwangi-nakuru',
    ownerUid: 'platform_verified',
    fullName: 'Jomo Mwangi Kariuki',
    trade: 'Automotive Diagnostics',
    county: 'Nakuru',
    town: 'Milimani & Naivasha Corridor',
    lat: -0.2833,
    lng: 36.0667,
    serviceRadiusKm: 90,
    calloutFeeKes: 1800,
    hourlyRateKes: 1400,
    experienceYears: 13,
    certification: 'NITA Grade I Auto Mechatronics',
    bio: 'Mobile OBD-II computer diagnostics, hybrid battery health checks, immobilizer key coding, and highway breakdown recovery along the A104.',
    availableNow: true,
    remoteSupport: true,
    languages: ['English', 'Swahili'],
    photoUrl: '/src/assets/images/tech_automotive_diag_1794914799080.jpg',
    ratingAvg: 4.9,
    jobsCompleted: 205,
  },
  {
    id: 'tech-hassan-mombasa',
    ownerUid: 'platform_verified',
    fullName: 'Amina Hassan Bakari',
    trade: 'Refrigeration & AC',
    county: 'Mombasa',
    town: 'Nyali & Mombasa Island',
    lat: -4.0435,
    lng: 39.6682,
    serviceRadiusKm: 65,
    calloutFeeKes: 1500,
    hourlyRateKes: 1300,
    experienceYears: 10,
    certification: 'HVACR Diploma & EPA Coastal Spec',
    bio: 'Split-unit inverter AC servicing, coastal salt-corrosion coil protection, cold-room compressor repairs, and commercial chiller maintenance.',
    availableNow: true,
    remoteSupport: false,
    languages: ['Swahili', 'English'],
    photoUrl: '/src/assets/images/tech_solar_electrical_1794914798345.jpg',
    ratingAvg: 4.8,
    jobsCompleted: 163,
  },
  {
    id: 'tech-kiprop-eldoret',
    ownerUid: 'platform_verified',
    fullName: 'Samuel Kiprop Tanui',
    trade: 'Electrical & Solar',
    county: 'Uasin Gishu',
    town: 'Eldoret & Elgon View',
    lat: 0.5143,
    lng: 35.2698,
    serviceRadiusKm: 110,
    calloutFeeKes: 1300,
    hourlyRateKes: 1000,
    experienceYears: 12,
    certification: 'EPRA Class C1 & Agribusiness Solar',
    bio: 'Off-grid lithium battery banks, dairy cooling solar backups, borehole solar inverter drives, and rural homestead wiring across North Rift.',
    availableNow: true,
    remoteSupport: true,
    languages: ['English', 'Swahili', 'Kalenjin'],
    photoUrl: '/src/assets/images/tech_solar_electrical_1794914798345.jpg',
    ratingAvg: 4.9,
    jobsCompleted: 129,
  },
  {
    id: 'tech-mutua-machakos',
    ownerUid: 'platform_verified',
    fullName: 'Peter Mutua Musyoka',
    trade: 'Appliance Repair',
    county: 'Machakos',
    town: 'Machakos Town & Syokimau',
    lat: -1.5177,
    lng: 37.2634,
    serviceRadiusKm: 60,
    calloutFeeKes: 1000,
    hourlyRateKes: 900,
    experienceYears: 7,
    certification: 'NITA Electronics & Home Appliances',
    bio: 'Same-day front-load washing machine drum/PCB repair, inverter fridge regassing, microwave magnetrons, and cooker element replacements.',
    availableNow: false,
    remoteSupport: true,
    languages: ['Swahili', 'English', 'Kamba'],
    photoUrl: '/src/assets/images/tech_ict_fiber_1794914798737.jpg',
    ratingAvg: 4.7,
    jobsCompleted: 94,
  },
  {
    id: 'tech-chebet-nyeri',
    ownerUid: 'platform_verified',
    fullName: 'Faith Chebet Ruto',
    trade: 'Welding & Masonry',
    county: 'Nyeri',
    town: 'Nyeri Town & Karatina',
    lat: -0.4246,
    lng: 36.951,
    serviceRadiusKm: 80,
    calloutFeeKes: 1200,
    hourlyRateKes: 1100,
    experienceYears: 9,
    certification: 'NCA Steel Fabrication & Structural',
    bio: 'Automated sliding gate fabrication, steel security grilles, solar panel roof-truss mounting frames, and structural concrete repairs.',
    availableNow: true,
    remoteSupport: false,
    languages: ['English', 'Swahili', 'Kikuyu'],
    photoUrl: '/src/assets/images/tech_plumbing_borehole_1794914799187.jpg',
    ratingAvg: 4.8,
    jobsCompleted: 88,
  },
];

export const PHOTO_OPTIONS: { label: string; url: string }[] = [
  { label: 'Electrical & Solar Rig', url: '/src/assets/images/hero_kenyan_technician_1794914798524.jpg' },
  { label: 'Battery & Inverter Specialist', url: '/src/assets/images/tech_solar_electrical_1794914798345.jpg' },
  { label: 'Plumbing & Borehole Manifold', url: '/src/assets/images/tech_plumbing_borehole_1794914799187.jpg' },
  { label: 'Automotive Diagnostics Bay', url: '/src/assets/images/tech_automotive_diag_1794914799080.jpg' },
  { label: 'ICT & Fiber Rack Setup', url: '/src/assets/images/tech_ict_fiber_1794914798737.jpg' },
];
