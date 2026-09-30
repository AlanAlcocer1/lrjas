import { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { rolesApi, usersApi } from '@/services/api';
import type { AccessRole, ActividadesUserRow } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge, EmptyState, Skeleton } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/utils';

export function UsersPage() {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<ActividadesUserRow[]>([]);
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ActividadesUserRow | null>(null);
  const [roleIds, setRoleIds] = useState<string[]>([]);

  const load = (query?: string) => {
    setLoading(true);
    usersApi
      .search(query)
      .then(setUsers)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (hasPermission('roles.view')) {
      rolesApi.list().then(setRoles).catch(() => []);
    }
  }, [hasPermission]);

  const openRoles = (user: ActividadesUserRow) => {
    setEditing(user);
    setRoleIds(user.roles.map((r) => r.id));
  };

  const saveRoles = async () => {
    if (!editing) return;
    try {
      await usersApi.assignRoles(editing.id, roleIds);
      toast.success('Roles actualizados');
      setEditing(null);
      load(q || undefined);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-sm text-muted-foreground">Participantes con acceso al módulo</p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(q || undefined);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por código o nombre"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {loading ? (
        <Skeleton className="h-24" />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Sin resultados" description="Prueba otro término de búsqueda." />
      ) : (
        <div className="grid gap-2">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground">Código {u.code}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {u.roles.map((r) => (
                      <Badge key={r.id} variant="secondary">
                        {r.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                {hasPermission('users.assign_roles') && (
                  <Button size="sm" variant="outline" onClick={() => openRoles(u)}>
                    Roles
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roles · {editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={roleIds.includes(r.id)}
                  onCheckedChange={(v) =>
                    setRoleIds((prev) =>
                      v === true ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                    )
                  }
                />
                {r.name}
              </label>
            ))}
          </div>
          <Button className="w-full" onClick={saveRoles}>
            Guardar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
