export const VALIDATION_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  kenyanPhonePattern: /^(\+254|0)[17]\d{8}$/,
  fullNameMin: 2,
  fullNameMax: 80,
  countyMin: 2,
  countyMax: 40,
  townMin: 2,
  townMax: 80,
  estateLandmarkMin: 2,
  estateLandmarkMax: 160,
  issueDescriptionMin: 10,
  issueDescriptionMax: 600,
  certificationMin: 2,
  certificationMax: 100,
  bioMin: 10,
  bioMax: 500,
  commentMin: 5,
  commentMax: 400,
  mpesaRefMax: 30,
  serviceRadiusMin: 5,
  serviceRadiusMax: 300,
  calloutFeeMin: 300,
  calloutFeeMax: 50000,
  hourlyRateMin: 300,
  hourlyRateMax: 30000,
  experienceMin: 0,
  experienceMax: 60,
} as const;

export function normalizeKenyanPhone(raw: string): string {
  return raw.replace(/[\s-]/g, '').trim();
}

export function isValidKenyanPhone(phone: string): boolean {
  return VALIDATION_LIMITS.kenyanPhonePattern.test(normalizeKenyanPhone(phone));
}

export function toE164KenyanPhone(phone: string): string {
  const cleaned = normalizeKenyanPhone(phone);
  if (cleaned.startsWith('+254')) return cleaned;
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+254${cleaned.slice(1)}`;
  }
  return cleaned;
}

export function formatKes(amount: number): string {
  return `KES ${amount.toLocaleString('en-KE')}`;
}
