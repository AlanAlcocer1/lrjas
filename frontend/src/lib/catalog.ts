export const NONE_OPTION_NAME = 'Ninguno';

export function findNingunoStake<T extends { name: string; id: string; wards: { id: string; name: string }[] }>(
  stakes: T[],
) {
  return stakes.find((s) => s.name === NONE_OPTION_NAME);
}

export function getNingunoWardId(stake: { wards: { id: string; name: string }[] } | undefined) {
  if (!stake) return '';
  const ward = stake.wards.find((w) => w.name === NONE_OPTION_NAME) ?? stake.wards[0];
  return ward?.id ?? '';
}

export function resolveStakeSelection(
  stakeId: string,
  stakes: { id: string; name: string; wards: { id: string; name: string }[] }[],
) {
  const stake = stakes.find((s) => s.id === stakeId);
  if (stake?.name === NONE_OPTION_NAME) {
    return { stakeId, wardId: getNingunoWardId(stake) };
  }
  return { stakeId, wardId: '' };
}

export function isNingunoStake(
  stake: { name: string } | undefined,
) {
  return stake?.name === NONE_OPTION_NAME;
}
