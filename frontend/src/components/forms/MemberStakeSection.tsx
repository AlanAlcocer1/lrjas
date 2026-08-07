import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isSpecialStake, resolveStakeSelection, NONE_OPTION_NAME } from '@/lib/catalog';
import { memberStakes } from '@/lib/member-field';
import type { Stake } from '@/types';

interface MemberStakeSectionProps {
  stakes: Stake[];
  stakeId: string;
  wardId: string;
  onStakeChange: (stakeId: string, wardId: string) => void;
  /** When true, show the member switch (admin edit). Default false for registration. */
  showMemberToggle?: boolean;
  isMember?: boolean;
  onMemberChange?: (checked: boolean) => void;
}

export function MemberStakeSection({
  stakes,
  stakeId,
  wardId,
  onStakeChange,
  showMemberToggle = false,
  isMember = true,
  onMemberChange,
}: MemberStakeSectionProps) {
  const selectedStake = stakes.find((s) => s.id === stakeId);
  const realStakes = memberStakes(stakes);
  const showSelects = showMemberToggle ? isMember : true;

  return (
    <div className="space-y-4">
      {showMemberToggle && onMemberChange && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
          <Label htmlFor="miembro-switch" className="font-medium cursor-pointer">
            Miembro
          </Label>
          <Switch id="miembro-switch" checked={isMember} onCheckedChange={onMemberChange} />
        </div>
      )}

      {showSelects && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Estaca *</Label>
            <Select
              value={stakeId}
              onValueChange={(v) => {
                const { stakeId: nextStakeId, wardId: nextWardId } = resolveStakeSelection(v, stakes);
                onStakeChange(nextStakeId, nextWardId);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tu estaca" />
              </SelectTrigger>
              <SelectContent>
                {realStakes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Barrio *</Label>
            <Select
              value={wardId}
              onValueChange={(v) => onStakeChange(stakeId, v)}
              disabled={!selectedStake || isSpecialStake(selectedStake)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona tu barrio" />
              </SelectTrigger>
              <SelectContent>
                {selectedStake?.wards
                  .filter((w) => w.name !== NONE_OPTION_NAME)
                  .map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
