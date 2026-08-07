import type { FieldDefinition, ParticipantType } from '@/types';
import { findNingunoStake, getNingunoWardId, isSpecialStake } from '@/lib/catalog';

export const MEMBER_FIELD_NAME = 'miembro';

export const PARTICIPANT_TYPE_LABELS: Record<ParticipantType, string> = {
  MEMBER: 'Miembro',
  NON_MEMBER: 'No miembro',
  VISITOR: 'Visitante',
};

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
  return stakes.filter((s) => !isSpecialStake(s));
}

export function validateMemberStake(
  stakes: { id: string; name: string }[],
  stakeId: string,
  wardId: string,
): string | null {
  const stake = stakes.find((s) => s.id === stakeId);
  if (!stake || isSpecialStake(stake)) return 'Selecciona una estaca';
  if (!wardId) return 'Selecciona un barrio';
  return null;
}

export function credentialAffiliationLabel(participant: {
  type?: ParticipantType | null;
  stake: { name: string };
  ward: { name: string };
}): string {
  const type = participant.type ?? 'MEMBER';
  if (type === 'NON_MEMBER' || type === 'VISITOR') {
    return PARTICIPANT_TYPE_LABELS[type];
  }
  return `${participant.stake.name} · ${participant.ward.name}`;
}
