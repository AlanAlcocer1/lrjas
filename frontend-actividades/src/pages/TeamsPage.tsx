import { useEffect, useState } from 'react';
import { Pencil, Plus, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { teamsApi, usersApi } from '@/services/api';
import type { ActividadesUserRow, Team } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState, Skeleton } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { cn, getErrorMessage } from '@/lib/utils';

const COLOR_PRESETS = [
  '#006837',
  '#84bd31',
  '#f59e0b',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#ef4444',
  '#0ea5e9',
  '#64748b',
];

export function TeamsPage() {
  const { hasPermission } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<ActividadesUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [membersOpen, setMembersOpen] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#84bd31');
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    teamsApi
      .list()
      .then(setTeams)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (hasPermission('users.view')) {
      usersApi.search().then(setUsers).catch(() => []);
    }
  }, [hasPermission]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setColor('#84bd31');
    setOpen(true);
  };

  const openEdit = (team: Team) => {
    setEditing(team);
    setName(team.name);
    setDescription(team.description || '');
    setColor(team.color || '#84bd31');
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    try {
      if (editing) {
        await teamsApi.update(editing.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        });
        toast.success('Equipo actualizado');
      } else {
        await teamsApi.create({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
        });
        toast.success('Equipo creado');
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openMembers = async (team: Team) => {
    try {
      const full = await teamsApi.get(team.id);
      setMembersOpen(full);
      setMemberIds(
        (full.members ?? [])
          .map(
            (m) =>
              m.participantId ||
              (m as { participant?: { id: string } }).participant?.id ||
              '',
          )
          .filter(Boolean),
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const saveMembers = async () => {
    if (!membersOpen) return;
    try {
      await teamsApi.setMembers(membersOpen.id, memberIds);
      toast.success('Miembros actualizados');
      setMembersOpen(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Equipos</h1>
          <p className="text-sm text-muted-foreground">Color visible en el calendario</p>
        </div>
        {hasPermission('teams.create') && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-24" />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Sin equipos"
          description="Crea el primero para agrupar responsables."
        />
      ) : (
        <div className="grid gap-3">
          {teams.map((team) => (
            <Card key={team.id} className="overflow-hidden">
              <div className="h-1.5 w-full" style={{ background: team.color || '#84bd31' }} />
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="h-8 w-8 rounded-xl shrink-0 border border-border"
                    style={{ background: team.color || '#84bd31' }}
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{team.name}</p>
                    {team.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{team.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {hasPermission('teams.edit') && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(team)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {hasPermission('teams.manage_members') && (
                    <Button size="sm" variant="outline" onClick={() => openMembers(team)}>
                      Miembros
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-transform',
                      color === c ? 'border-foreground scale-110' : 'border-transparent',
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-14 p-1 cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="font-mono uppercase"
                  maxLength={7}
                />
              </div>
            </div>
            <Button className="w-full" onClick={save}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!membersOpen} onOpenChange={(o) => !o && setMembersOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Miembros · {membersOpen?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={memberIds.includes(u.id)}
                  onCheckedChange={(v) =>
                    setMemberIds((prev) =>
                      v === true ? [...prev, u.id] : prev.filter((id) => id !== u.id),
                    )
                  }
                />
                {u.name} <span className="text-muted-foreground">({u.code})</span>
              </label>
            ))}
          </div>
          <Button className="w-full" onClick={saveMembers}>
            Guardar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
