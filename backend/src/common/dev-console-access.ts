const DEFAULT_DEV_USERNAMES = ['000', 'alan'];

export function getDevConsoleUsernames(): Set<string> {
  const fromEnv = (process.env.DEV_CONSOLE_USERNAMES ?? '')
    .split(',')
    .map((u) => u.toLowerCase().trim())
    .filter(Boolean);

  const master = (process.env.MASTER_USER_USERNAME ?? 'alan').toLowerCase().trim();

  return new Set([...DEFAULT_DEV_USERNAMES, master, ...fromEnv]);
}

export function isDevConsoleUser(username: string | undefined | null): boolean {
  if (!username) return false;
  return getDevConsoleUsernames().has(username.toLowerCase().trim());
}
