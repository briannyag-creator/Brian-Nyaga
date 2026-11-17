export const GOOGLE_MAPS_API_KEY: string =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  (typeof process !== 'undefined' ? process.env?.GOOGLE_MAPS_API_KEY || '' : '');

export const MAPS_ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];

export const KENYA_DEFAULT_CENTER = { lat: -0.42, lng: 36.82 };
export const KENYA_DEFAULT_ZOOM = 7;
