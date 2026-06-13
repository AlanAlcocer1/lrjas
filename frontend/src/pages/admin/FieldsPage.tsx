import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Settings2, Loader2 } from 'lucide-react';
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
import { fieldsApi } from '@/services/api';
import type { FieldDefinition } from '@/types';

export default function FieldsPage() {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ label: '', active: true });

  const load = () => {
    setLoading(true);
    fieldsApi
      .getAll()
      .then(setFields)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!form.label.trim()) {
      toast.error('Ingresa un nombre para el campo');
      return;
    }
    setSubmitting(true);
    try {
      await fieldsApi.create({
        name: form.label.toLowerCase().replace(/\s+/g, '_'),
        label: form.label,
        type: 'CHECKBOX',
        required: false,
        active: form.active,
      });
      toast.success('Campo creado');
      setDialogOpen(false);
      setForm({ label: '', active: true });
      load();
    } catch {
      toast.error('Error al crear campo');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (field: FieldDefinition) => {
    await fieldsApi.update(field.id, { active: !field.active });
    toast.success(field.active ? 'Campo desactivado' : 'Campo activado');
    load();
  };

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6 pb-20 lg:pb-6 max-w-2xl">
          <FadeIn>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Configuración de formularios</h1>
                <p className="text-sm text-muted-foreground">
                  Checkboxes opcionales: marcado = Sí, sin marcar = No
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar campo</span>
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((field, i) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className={!field.active ? 'opacity-60' : ''}>
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                              <Settings2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-medium">{field.label}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">Checkbox · {field.name}</p>
                              {!field.active && (
                                <Badge variant="destructive" className="mt-2">Inactivo</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Activo</Label>
                            <Switch checked={field.active} onCheckedChange={() => toggleActive(field)} />
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar campo</DialogTitle>
              <DialogDescription>
                Pregunta de Sí/No. El usuario puede dejarlo sin marcar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del campo</Label>
                <Input
                  placeholder="Ej: Miembro"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Activo</Label>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear campo'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </AdminLayout>
  );
}
