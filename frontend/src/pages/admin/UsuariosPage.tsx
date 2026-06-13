import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Eye,
  Pencil,
  UserX,
  History,
  ChevronLeft,
  ChevronRight,
  Users,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, EmptyState, Skeleton } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { participantsApi, catalogApi, attendanceApi, fieldsApi } from '@/services/api';
import { isNingunoStake, resolveStakeSelection } from '@/lib/catalog';
import { exportToExcel, buildDynamicFieldColumns } from '@/lib/export';
import { formatDate, formatTime } from '@/lib/utils';
import type { Participant, Stake } from '@/types';

export default function UsuariosPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [selected, setSelected] = useState<Participant | null>(null);
  const [history, setHistory] = useState<{ id: string; method: string; createdAt: string }[]>([]);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'history' | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    motherLastName: '',
    age: 18,
    sex: 'MALE' as 'MALE' | 'FEMALE',
    stakeId: '',
    wardId: '',
    active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await participantsApi.getAll({
        search,
        page: String(page),
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setParticipants(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    catalogApi.getStakes().then(setStakes);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openView = (p: Participant) => {
    setSelected(p);
    setDialogMode('view');
  };

  const openEdit = (p: Participant) => {
    setSelected(p);
    setEditForm({
      firstName: p.firstName,
      middleName: p.middleName ?? '',
      lastName: p.lastName,
      motherLastName: p.motherLastName,
      age: p.age,
      sex: p.sex,
      stakeId: p.stake.id,
      wardId: p.ward.id,
      active: p.active,
    });
    setDialogMode('edit');
  };

  const openHistory = async (p: Participant) => {
    setSelected(p);
    const h = await attendanceApi.getHistory(p.id);
    setHistory(h);
    setDialogMode('history');
  };

  const deactivate = async (p: Participant) => {
    await participantsApi.deactivate(p.id);
    toast.success('Usuario desactivado');
    load();
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await participantsApi.update(selected.id, {
        firstName: editForm.firstName.toUpperCase(),
        middleName: editForm.middleName.toUpperCase() || undefined,
        lastName: editForm.lastName.toUpperCase(),
        motherLastName: editForm.motherLastName.toUpperCase(),
        age: editForm.age,
        sex: editForm.sex,
        stakeId: editForm.stakeId,
        wardId: editForm.wardId,
        active: editForm.active,
      });
      toast.success('Usuario actualizado');
      setDialogMode(null);
      load();
    } catch {
      toast.error('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const [res, fields] = await Promise.all([
        participantsApi.getAll({
          search,
          page: '1',
          limit: '10000',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
        fieldsApi.getActive(),
      ]);
      exportToExcel(
        res.items.map((p) => ({
          Código: p.code,
          Nombre: p.fullName,
          Edad: p.age,
          Sexo: p.sex === 'MALE' ? 'Masculino' : 'Femenino',
          Estaca: p.stake.name,
          Barrio: p.ward.name,
          Activo: p.active ? 'Sí' : 'No',
          Registro: formatDate(p.createdAt),
          ...buildDynamicFieldColumns(fields, p.dynamicFields),
        })),
        `usuarios-lrjas-${new Date().toISOString().slice(0, 10)}`,
      );
      toast.success('Excel descargado');
    } catch {
      toast.error('Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const editStake = stakes.find((s) => s.id === editForm.stakeId);

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6 pb-20 lg:pb-6">
          <FadeIn>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-1">Usuarios</h1>
                <p className="text-sm text-muted-foreground">{total} registrados</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={exportExcel} disabled={exporting} className="gap-2">
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  Excel
                </Button>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : participants.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Sin usuarios"
                    description="No se encontraron usuarios con esos criterios"
                  />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="text-left p-4 font-medium">Código</th>
                            <th className="text-left p-4 font-medium hidden sm:table-cell">Nombre</th>
                            <th className="text-left p-4 font-medium hidden md:table-cell">Edad</th>
                            <th className="text-left p-4 font-medium hidden lg:table-cell">Estaca</th>
                            <th className="text-left p-4 font-medium hidden xl:table-cell">Registro</th>
                            <th className="text-right p-4 font-medium">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {participants.map((p, i) => (
                            <motion.tr
                              key={p.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.03 }}
                              className="border-b border-border/70 hover:bg-muted/60"
                            >
                              <td className="p-4">
                                <span className="font-mono font-bold text-leaf-dark">{p.code}</span>
                                {!p.active && <Badge variant="destructive" className="ml-2">Inactivo</Badge>}
                              </td>
                              <td className="p-4 hidden sm:table-cell">{p.fullName}</td>
                              <td className="p-4 hidden md:table-cell">{p.age}</td>
                              <td className="p-4 hidden lg:table-cell text-muted-foreground">{p.stake.name}</td>
                              <td className="p-4 hidden xl:table-cell text-muted-foreground">{formatDate(p.createdAt)}</td>
                              <td className="p-4">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openView(p)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => openHistory(p)}>
                                    <History className="h-4 w-4" />
                                  </Button>
                                  {p.active && (
                                    <Button variant="ghost" size="icon" onClick={() => deactivate(p)}>
                                      <UserX className="h-4 w-4 text-red-400" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between p-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        <Dialog open={dialogMode === 'view'} onOpenChange={() => setDialogMode(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalle del usuario</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Código</span><span className="font-mono font-bold">{selected.code}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Nombre</span><span>{selected.fullName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Edad</span><span>{selected.age}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sexo</span><span>{selected.sex === 'MALE' ? 'Masculino' : 'Femenino'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Estaca</span><span>{selected.stake.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Barrio</span><span>{selected.ward.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><span>{selected.active ? 'Activo' : 'Inactivo'}</span></div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={dialogMode === 'edit'} onOpenChange={() => setDialogMode(null)}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar usuario</DialogTitle>
              <DialogDescription>Código {selected?.code}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primer nombre</Label>
                  <Input value={editForm.firstName} className="uppercase" onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-2">
                  <Label>Segundo nombre</Label>
                  <Input value={editForm.middleName} className="uppercase" onChange={(e) => setEditForm({ ...editForm, middleName: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Apellido paterno</Label>
                  <Input value={editForm.lastName} className="uppercase" onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value.toUpperCase() })} />
                </div>
                <div className="space-y-2">
                  <Label>Apellido materno</Label>
                  <Input value={editForm.motherLastName} className="uppercase" onChange={(e) => setEditForm({ ...editForm, motherLastName: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Edad</Label>
                  <Input type="number" min={18} max={45} value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select value={editForm.sex} onValueChange={(v) => setEditForm({ ...editForm, sex: v as 'MALE' | 'FEMALE' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Masculino</SelectItem>
                      <SelectItem value="FEMALE">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Estaca</Label>
                <Select
                  value={editForm.stakeId}
                  onValueChange={(v) => setEditForm({ ...editForm, ...resolveStakeSelection(v, stakes) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stakes.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Barrio</Label>
                <Select
                  value={editForm.wardId}
                  onValueChange={(v) => setEditForm({ ...editForm, wardId: v })}
                  disabled={!editStake || isNingunoStake(editStake)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona barrio" /></SelectTrigger>
                  <SelectContent>
                    {editStake?.wards.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Activo</Label>
                <Switch checked={editForm.active} onCheckedChange={(v) => setEditForm({ ...editForm, active: v })} />
              </div>
              <Button onClick={saveEdit} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cambios'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogMode === 'history'} onOpenChange={() => setDialogMode(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Historial de asistencias</DialogTitle>
              <DialogDescription>{selected?.fullName}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin asistencias registradas</p>
              ) : (
                history.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div>
                      <p className="text-sm">{formatDate(a.createdAt)}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(a.createdAt)}</p>
                    </div>
                    <Badge variant="outline">{a.method === 'QR' ? 'QR' : 'Manual'}</Badge>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </AdminLayout>
  );
}
