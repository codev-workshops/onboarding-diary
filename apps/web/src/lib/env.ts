/** Runtime configuration supplied by Vite at build time (TRD 9). */

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';
