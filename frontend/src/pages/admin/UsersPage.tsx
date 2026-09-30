import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge, EmptyState, Skeleton } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { usersApi } from '@/services/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { AdminUser } from '@/types';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await usersApi.getAll());
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', username: '', password: '' });
    setDialogOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({ name: u.name, username: u.username, password: '' });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      toast.error('Completa nombre y usuario');
      return;
    }
    if (!editing && form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await usersApi.update(editing.id, {
          name: form.name,
          username: form.username,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success('Usuario actualizado');
      } else {
        await usersApi.create(form);
        toast.success('Usuario creado');
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error(editing ? 'Error al actualizar' : 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!userToDelete) return;
    try {
      await usersApi.remove(userToDelete.id);
      toast.success('Usuario eliminado');
      load();
    } catch {
      toast.error('No se pudo eliminar el usuario');
      throw new Error('delete failed');
    }
  };

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6 pb-20 lg:pb-6 max-w-3xl">
          <FadeIn>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-1">Usuarios admin</h1>
                <p className="text-sm text-muted-foreground">Gestiona quién puede acceder al panel</p>
              </div>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo admin
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : users.length === 0 ? (
                  <EmptyState icon={Shield} title="Sin usuarios" description="Crea el primer administrador" />
                ) : (
                  <div className="divide-y divide-border">
                    {users.map((u, i) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-4 gap-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{u.name}</p>
                            {u.id === currentUser?.id && <Badge variant="outline">Tú</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">@{u.username}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Desde {formatDate(u.createdAt)}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {u.id !== currentUser?.id && (
                            <Button variant="ghost" size="icon" onClick={() => setUserToDelete(u)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar admin' : 'Nuevo admin'}</DialogTitle>
              <DialogDescription>
                {editing ? 'Deja la contraseña vacía para no cambiarla' : 'Crea un usuario con acceso al panel'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Usuario</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <Button onClick={save} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Guardar' : 'Crear usuario'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <ConfirmDialog
          open={!!userToDelete}
          onOpenChange={(open) => {
            if (!open) setUserToDelete(null);
          }}
          title="Eliminar usuario"
          description={
            userToDelete ? `¿Eliminar a ${userToDelete.name}?` : undefined
          }
          confirmLabel="Eliminar"
          onConfirm={remove}
        />
      </PageTransition>
    </AdminLayout>
  );
}
