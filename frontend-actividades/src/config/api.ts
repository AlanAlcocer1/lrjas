export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
/**
 * Base absoluta para links ICS (Google/Apple).
 * Debe ser la API real (Coolify), no el dominio de Cloudflare Pages.
 */
export const PUBLIC_API_URL =
  import.meta.env.VITE_PUBLIC_API_URL || API_URL;
export const TOKEN_KEY = 'lrjas_actividades_token';
