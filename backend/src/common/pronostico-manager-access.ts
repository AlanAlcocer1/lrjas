const PRONOSTICO_MANAGER_USERNAMES = ['000', '001'];

export function isPronosticoManager(username: string | undefined | null): boolean {
  if (!username) return false;
  return PRONOSTICO_MANAGER_USERNAMES.includes(username.toLowerCase().trim());
}
