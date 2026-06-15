import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface FieldSwitchRowProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function FieldSwitchRow({ id, label, checked, onCheckedChange }: FieldSwitchRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
      <Label htmlFor={id} className="font-normal cursor-pointer leading-snug">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
