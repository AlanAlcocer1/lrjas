const PRONOSTICO_MANAGER_USERNAMES = new Set(['000', '001']);

export function canManagePronosticos(
  username?: string | null,
  pronosticoManager?: boolean,
): boolean {
  if (pronosticoManager) return true;
  if (!username) return false;
  return PRONOSTICO_MANAGER_USERNAMES.has(username.toLowerCase().trim());
}
