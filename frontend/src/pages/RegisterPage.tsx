import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { catalogApi, fieldsApi, participantsApi } from '@/services/api';
import {
  findNingunoStake,
  getNingunoWardId,
  isNingunoStake,
  resolveStakeSelection,
} from '@/lib/catalog';
import type { FieldDefinition, Stake } from '@/types';

const baseSchema = z.object({
  firstName: z.string().min(2, 'Mínimo 2 caracteres'),
  middleName: z.string().optional(),
  lastName: z.string().min(2, 'Mínimo 2 caracteres'),
  motherLastName: z.string().min(2, 'Mínimo 2 caracteres'),
  age: z.coerce.number().pipe(z.number().min(18, 'Mínimo 18 años').max(45, 'Máximo 45 años')),
  sex: z.enum(['MALE', 'FEMALE']),
  stakeId: z.string().min(1, 'Selecciona una estaca'),
  wardId: z.string().min(1, 'Selecciona un barrio'),
});

type RegisterFormValues = z.infer<typeof baseSchema>;

const nameFieldProps = {
  className: 'uppercase',
  setValueAs: (v: string) => (typeof v === 'string' ? v.toUpperCase() : v),
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = e.target.value.toUpperCase();
  },
} as const;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dynamicValues, setDynamicValues] = useState<Record<string, boolean>>({});

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(baseSchema) as Resolver<RegisterFormValues>,
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      motherLastName: '',
      age: 18,
      sex: 'MALE',
      stakeId: '',
      wardId: '',
    },
  });

  const stakeId = form.watch('stakeId');
  const selectedStake = stakes.find((s) => s.id === stakeId);

  useEffect(() => {
    Promise.all([catalogApi.getStakes(), fieldsApi.getActive()])
      .then(([s, f]) => {
        setStakes(s);
        setFields(f);
        const defaults: Record<string, boolean> = {};
        f.forEach((field) => { defaults[field.name] = false; });
        setDynamicValues(defaults);

        const ninguno = findNingunoStake(s);
        if (ninguno) {
          form.setValue('stakeId', ninguno.id);
          form.setValue('wardId', getNingunoWardId(ninguno));
        }
      })
      .catch(() => toast.error('Error al cargar datos'))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (data: RegisterFormValues) => {
    for (const field of fields) {
      if (field.required && !dynamicValues[field.name]) {
        toast.error(`${field.label} es obligatorio`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const participant = await participantsApi.register({
        ...data,
        firstName: data.firstName.toUpperCase(),
        middleName: data.middleName?.toUpperCase(),
        lastName: data.lastName.toUpperCase(),
        motherLastName: data.motherLastName.toUpperCase(),
        dynamicFields: dynamicValues,
      });
      navigate('/register/success', { state: { participant } });
    } catch {
      toast.error('Error al registrar. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <PageTransition>
        <FadeIn>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Registro de usuario</CardTitle>
              <CardDescription>Completa tus datos para obtener tu código personal</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Primer nombre *</Label>
                      <Input id="firstName" {...form.register('firstName', nameFieldProps)} />
                      {form.formState.errors.firstName && (
                        <p className="text-xs text-red-400">{form.formState.errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="middleName">Segundo nombre</Label>
                      <Input id="middleName" {...form.register('middleName', nameFieldProps)} />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Apellido paterno *</Label>
                      <Input id="lastName" {...form.register('lastName', nameFieldProps)} />
                      {form.formState.errors.lastName && (
                        <p className="text-xs text-red-400">{form.formState.errors.lastName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motherLastName">Apellido materno *</Label>
                      <Input id="motherLastName" {...form.register('motherLastName', nameFieldProps)} />
                      {form.formState.errors.motherLastName && (
                        <p className="text-xs text-red-400">{form.formState.errors.motherLastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="age">Edad *</Label>
                      <Input id="age" type="number" min={18} max={45} {...form.register('age')} />
                      {form.formState.errors.age && (
                        <p className="text-xs text-red-400">{form.formState.errors.age.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Sexo *</Label>
                      <Select value={form.watch('sex')} onValueChange={(v) => form.setValue('sex', v as 'MALE' | 'FEMALE')}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Masculino</SelectItem>
                          <SelectItem value="FEMALE">Femenino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Estaca *</Label>
                    <Select
                      value={stakeId}
                      onValueChange={(v) => {
                        const { stakeId: nextStakeId, wardId } = resolveStakeSelection(v, stakes);
                        form.setValue('stakeId', nextStakeId);
                        form.setValue('wardId', wardId);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecciona tu estaca" /></SelectTrigger>
                      <SelectContent>
                        {stakes.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Barrio *</Label>
                    <Select
                      value={form.watch('wardId')}
                      onValueChange={(v) => form.setValue('wardId', v)}
                      disabled={!selectedStake || isNingunoStake(selectedStake)}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecciona tu barrio" /></SelectTrigger>
                      <SelectContent>
                        {selectedStake?.wards.map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {fields.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 pt-2 border-t border-border"
                    >
                      <p className="text-sm font-medium text-foreground pt-2">Información adicional</p>
                      {fields.map((field) => (
                        <div key={field.id} className="flex items-center gap-3">
                          <Checkbox
                            id={field.name}
                            checked={dynamicValues[field.name] ?? false}
                            onCheckedChange={(checked) =>
                              setDynamicValues((prev) => ({ ...prev, [field.name]: !!checked }))
                            }
                          />
                          <Label htmlFor={field.name} className="font-normal cursor-pointer">
                            {field.label}{field.required ? ' *' : ''}
                          </Label>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Completar registro
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </PageTransition>
    </PublicLayout>
  );
}
