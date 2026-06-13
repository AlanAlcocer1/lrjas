import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, MapPin, Loader2 } from 'lucide-react';
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
import { catalogApi } from '@/services/api';
import { NONE_OPTION_NAME } from '@/lib/catalog';
import type { Stake, Ward } from '@/types';

export default function StakesPage() {
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [loading, setLoading] = useState(true);
  const [stakeDialogOpen, setStakeDialogOpen] = useState(false);
  const [wardDialogOpen, setWardDialogOpen] = useState(false);
  const [selectedStakeId, setSelectedStakeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stakeName, setStakeName] = useState('');
  const [wardName, setWardName] = useState('');

  const load = () => {
    setLoading(true);
    catalogApi
      .getAllStakes()
      .then(setStakes)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreateStake = async () => {
    if (!stakeName.trim()) {
      toast.error('Ingresa el nombre de la estaca');
      return;
    }
    setSubmitting(true);
    try {
      await catalogApi.createStake(stakeName.trim());
      toast.success('Estaca creada');
      setStakeDialogOpen(false);
      setStakeName('');
      load();
    } catch {
      toast.error('Error al crear estaca');
    } finally {
      setSubmitting(false);
    }
  };

  const openWardDialog = (stakeId: string) => {
    setSelectedStakeId(stakeId);
    setWardName('');
    setWardDialogOpen(true);
  };

  const handleCreateWard = async () => {
    if (!selectedStakeId || !wardName.trim()) {
      toast.error('Ingresa el nombre del barrio');
      return;
    }
    setSubmitting(true);
    try {
      await catalogApi.createWard(selectedStakeId, wardName.trim());
      toast.success('Barrio creado');
      setWardDialogOpen(false);
      setWardName('');
      load();
    } catch {
      toast.error('Error al crear barrio');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStakeActive = async (stake: Stake) => {
    await catalogApi.updateStake(stake.id, { active: !stake.active });
    toast.success(stake.active ? 'Estaca desactivada' : 'Estaca activada');
    load();
  };

  const toggleWardActive = async (ward: Ward) => {
    await catalogApi.updateWard(ward.id, { active: !ward.active });
    toast.success(ward.active ? 'Barrio desactivado' : 'Barrio activado');
    load();
  };

  const selectedStake = stakes.find((s) => s.id === selectedStakeId);

  return (
    <AdminLayout>
      <PageTransition>
        <div className="space-y-6 pb-20 lg:pb-6 max-w-3xl">
          <FadeIn>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-1">Estacas y barrios</h1>
                <p className="text-sm text-muted-foreground">
                  Administra las estacas y sus barrios para el registro
                </p>
              </div>
              <Button onClick={() => setStakeDialogOpen(true)} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar estaca</span>
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : stakes.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Sin estacas registradas</p>
                  <p className="text-sm mt-1">Agrega la primera estaca para comenzar</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {stakes.map((stake, i) => (
                  <motion.div
                    key={stake.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className={!stake.active ? 'opacity-60' : ''}>
                      <CardContent className="p-4 sm:p-5 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-medium truncate">{stake.name}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {stake.wards.length} barrio{stake.wards.length !== 1 ? 's' : ''}
                              </p>
                              {!stake.active && (
                                <Badge variant="destructive" className="mt-2">
                                  Inactiva
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3 shrink-0">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs text-muted-foreground">Activa</Label>
                              <Switch
                                checked={stake.active ?? true}
                                onCheckedChange={() => toggleStakeActive(stake)}
                                disabled={stake.name === NONE_OPTION_NAME}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => openWardDialog(stake.id)}
                              disabled={!stake.active || stake.name === NONE_OPTION_NAME}
                            >
                              <Plus className="h-3 w-3" />
                              Barrio
                            </Button>
                          </div>
                        </div>

                        {stake.wards.length > 0 && (
                          <div className="border-t border-border pt-3 space-y-2">
                            {stake.wards.map((ward) => (
                              <div
                                key={ward.id}
                                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-muted/50 ${!ward.active ? 'opacity-60' : ''}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm truncate">{ward.name}</span>
                                  {!ward.active && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Inactivo
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Label className="text-xs text-muted-foreground">Activo</Label>
                                  <Switch
                                    checked={ward.active ?? true}
                                    onCheckedChange={() => toggleWardActive(ward)}
                                    disabled={ward.name === NONE_OPTION_NAME}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </FadeIn>
        </div>

        <Dialog open={stakeDialogOpen} onOpenChange={setStakeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar estaca</DialogTitle>
              <DialogDescription>Cada estaca puede tener varios barrios</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre de la estaca</Label>
                <Input
                  placeholder="Ej: Estaca Centro"
                  value={stakeName}
                  onChange={(e) => setStakeName(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateStake} className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear estaca'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={wardDialogOpen} onOpenChange={setWardDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar barrio</DialogTitle>
              <DialogDescription>
                Estaca: {selectedStake?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del barrio</Label>
                <Input
                  placeholder="Ej: Barrio Libertad"
                  value={wardName}
                  onChange={(e) => setWardName(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateWard} className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear barrio'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </AdminLayout>
  );
}
