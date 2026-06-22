const DEFAULT_PRONOSTICO_MANAGER_USERNAMES = new Set(['000', '001', 'alan', 'anahi']);

export function canManagePronosticos(
  username?: string | null,
  pronosticoManager?: boolean,
): boolean {
  if (pronosticoManager) return true;
  if (!username) return false;
  return DEFAULT_PRONOSTICO_MANAGER_USERNAMES.has(username.toLowerCase().trim());
}
