import { useEffect, useMemo, useState } from 'react';
import { Plus, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { activitiesApi, rolesApi } from '@/services/api';
import type { AccessRole, ActivityStatus, Permission } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge, EmptyState, Skeleton } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/utils';

export function SettingsPage() {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [statuses, setStatuses] = useState<ActivityStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleOpen, setRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AccessRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [permIds, setPermIds] = useState<string[]>([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusName, setStatusName] = useState('');
  const [statusColor, setStatusColor] = useState('#84bd31');

  const permGroups = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      if (!map.has(p.groupKey)) map.set(p.groupKey, []);
      map.get(p.groupKey)!.push(p);
    }
    return Array.from(map.entries());
  }, [permissions]);

  const load = async () => {
    setLoading(true);
    try {
      const jobs: Promise<void>[] = [];
      if (hasPermission('roles.view')) {
        jobs.push(
          rolesApi.list().then(setRoles).then(() => undefined),
          rolesApi.listPermissions().then(setPermissions).then(() => undefined),
        );
      }
      if (hasPermission('activities.view') || hasPermission('settings.manage')) {
        jobs.push(activitiesApi.listStatuses().then(setStatuses).then(() => undefined));
      }
      await Promise.all(jobs);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDesc('');
    setPermIds([]);
    setRoleOpen(true);
  };

  const openEditRole = async (role: AccessRole) => {
    try {
      const full = await rolesApi.get(role.id);
      setEditingRole(full);
      setRoleName(full.name);
      setRoleDesc(full.description || '');
      const raw = full.permissions ?? [];
      const ids = raw.map((item) =>
        'permission' in item && item.permission ? item.permission.id : (item as Permission).id,
      );
      setPermIds(ids);
      setRoleOpen(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const saveRole = async () => {
    if (!roleName.trim()) return;
    try {
      if (editingRole) {
        await rolesApi.update(editingRole.id, {
          name: roleName.trim(),
          description: roleDesc.trim() || undefined,
          permissionIds: permIds,
        });
        toast.success('Rol actualizado');
      } else {
        await rolesApi.create({
          name: roleName.trim(),
          description: roleDesc.trim() || undefined,
          permissionIds: permIds,
        });
        toast.success('Rol creado');
      }
      setRoleOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const createStatus = async () => {
    if (!statusName.trim()) return;
    try {
      await activitiesApi.createStatus({ name: statusName.trim(), color: statusColor });
      toast.success('Estado creado');
      setStatusOpen(false);
      setStatusName('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!hasPermission('roles.view') && !hasPermission('settings.manage')) {
    return (
      <EmptyState
        icon={Settings}
        title="Sin acceso"
        description="No tienes permisos de configuración."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Roles y estados operativos</p>
      </div>

      <Tabs defaultValue={hasPermission('roles.view') ? 'roles' : 'estados'}>
        <TabsList>
          {hasPermission('roles.view') && <TabsTrigger value="roles">Roles</TabsTrigger>}
          {(hasPermission('settings.manage') || hasPermission('activities.view')) && (
            <TabsTrigger value="estados">Estados</TabsTrigger>
          )}
        </TabsList>

        {hasPermission('roles.view') && (
          <TabsContent value="roles" className="space-y-3">
            {hasPermission('roles.create') && (
              <Button size="sm" onClick={openCreateRole}>
                <Plus className="h-4 w-4" />
                Nuevo rol
              </Button>
            )}
            {roles.length === 0 ? (
              <EmptyState icon={Settings} title="Sin roles" description="Crea roles de acceso." />
            ) : (
              roles.map((role) => (
                <Card key={role.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{role.name}</p>
                      {role.description && (
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      )}
                      <Badge variant={role.active ? 'success' : 'secondary'} className="mt-2">
                        {role.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    {hasPermission('roles.edit') && (
                      <Button size="sm" variant="outline" onClick={() => openEditRole(role)}>
                        Editar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        <TabsContent value="estados" className="space-y-3">
          {hasPermission('settings.manage') && (
            <Button size="sm" onClick={() => setStatusOpen(true)}>
              <Plus className="h-4 w-4" />
              Nuevo estado
            </Button>
          )}
          {statuses.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                <div className="flex-1">
                  <p className="font-medium">{s.name}</p>
                  <div className="flex gap-1 mt-1">
                    {s.isInitial && <Badge variant="secondary">Inicial</Badge>}
                    {s.isFinal && <Badge variant="secondary">Final</Badge>}
                    {!s.isActive && <Badge variant="outline">Inactivo</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Editar rol' : 'Nuevo rol'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} />
            </div>
            {hasPermission('roles.assign_permissions') && (
              <div className="max-h-56 overflow-y-auto space-y-4 border border-border rounded-lg p-3">
                {permGroups.map(([group, perms]) => (
                  <div key={group}>
                    <CardHeader className="p-0 pb-2">
                      <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                        {group}
                      </CardTitle>
                    </CardHeader>
                    <div className="space-y-1.5">
                      {perms.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={permIds.includes(p.id)}
                            onCheckedChange={(v) =>
                              setPermIds((prev) =>
                                v === true ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                              )
                            }
                          />
                          {p.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full" onClick={saveRole}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo estado</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={statusName} onChange={(e) => setStatusName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input type="color" value={statusColor} onChange={(e) => setStatusColor(e.target.value)} />
            </div>
            <Button className="w-full" onClick={createStatus}>
              Crear
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
