const DEFAULT_PRONOSTICO_MANAGER_USERNAMES = ['000', '001', 'anahi'];

export function getPronosticoManagerUsernames(): Set<string> {
  const fromEnv = (process.env.PRONOSTICO_MANAGER_USERNAMES ?? '')
    .split(',')
    .map((u) => u.toLowerCase().trim())
    .filter(Boolean);

  const master = (process.env.MASTER_USER_USERNAME ?? 'alan').toLowerCase().trim();

  return new Set([...DEFAULT_PRONOSTICO_MANAGER_USERNAMES, master, ...fromEnv]);
}

export function isPronosticoManager(username: string | undefined | null): boolean {
  if (!username) return false;
  return getPronosticoManagerUsernames().has(username.toLowerCase().trim());
}
