import type { FieldDefinition } from '@/types';
import { findNingunoStake, getNingunoWardId, isNingunoStake } from '@/lib/catalog';

export const MEMBER_FIELD_NAME = 'miembro';

export function splitMemberField(fields: FieldDefinition[]) {
  const miembroField = fields.find((f) => f.name === MEMBER_FIELD_NAME);
  const otherFields = fields.filter((f) => f.name !== MEMBER_FIELD_NAME);
  return { miembroField, otherFields };
}

export function isMemberSelected(dynamicFields: Record<string, boolean | undefined>) {
  return dynamicFields[MEMBER_FIELD_NAME] === true;
}

export function inferMemberFromStake(
  dynamicFields: Record<string, boolean | undefined>,
  stakeName: string,
): boolean {
  if (dynamicFields[MEMBER_FIELD_NAME] === true) return true;
  return stakeName !== 'Ninguno';
}

export function applyNingunoStake(
  stakes: { id: string; name: string; wards: { id: string; name: string }[] }[],
): { stakeId: string; wardId: string } | null {
  const ninguno = findNingunoStake(stakes);
  if (!ninguno) return null;
  return { stakeId: ninguno.id, wardId: getNingunoWardId(ninguno) };
}

export function memberStakes<T extends { id: string; name: string }>(stakes: T[]): T[] {
  return stakes.filter((s) => !isNingunoStake(s));
}

export function validateMemberStake(
  stakes: { id: string; name: string }[],
  stakeId: string,
  wardId: string,
  isMember: boolean,
): string | null {
  if (!isMember) return null;
  const stake = stakes.find((s) => s.id === stakeId);
  if (!stake || isNingunoStake(stake)) return 'Selecciona una estaca';
  if (!wardId) return 'Selecciona un barrio';
  return null;
}
