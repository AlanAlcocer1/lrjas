import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, CalendarDays, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge, Skeleton } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { eventsApi, getApiErrorMessage } from '@/services/api';
import type { EventItem } from '@/types';

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', active: true });

  const load = () => {
    setLoading(true);
    eventsApi
      .getAll()
      .then(setEvents)
      .catch(() => toast.error('Error al cargar eventos'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Ingresa un nombre para el evento');
      return;
    }
    if (form.name.trim().toLowerCase() === 'general') {
      toast.error('Ese nombre está reservado');
      return;
    }
    setSubmitting(true);
    try {
      await eventsApi.create({
        name: form.name.trim(),
        active: form.active,
      });
      toast.success('Evento creado');
      setDialogOpen(false);
      setForm({ name: '', active: true });
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Error al crear evento'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (event: EventItem) => {
    try {
      await eventsApi.update(event.id, { active: !event.active });
      toast.success(event.active ? 'Evento desactivado' : 'Evento activado');
      load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo actualizar'));
    }
  };

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6 pb-20 lg:pb-6 max-w-2xl">
          <FadeIn>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Eventos</h1>
                <p className="text-sm text-muted-foreground">
                  Catálogo para registrar asistencias por evento
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar evento</span>
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className={!event.active ? 'opacity-60' : ''}>
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-medium">{event.name}</h3>
                              {!event.active && (
                                <Badge variant="destructive" className="mt-2">
                                  Inactivo
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Activo</Label>
                            <Switch
                              checked={event.active}
                              onCheckedChange={() => toggleActive(event)}
                              disabled={event.name === 'General'}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </FadeIn>
        </div>
      </PageTransition>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo evento</DialogTitle>
            <DialogDescription>Se mostrará en el select de check-in</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Autosuficiencia"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <Label>Activo</Label>
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
            <Button onClick={handleCreate} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear evento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
