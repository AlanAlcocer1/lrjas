import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MemberStakeSection } from '@/components/forms/MemberStakeSection';
import { FieldSwitchRow } from '@/components/forms/FieldSwitchRow';
import { catalogApi, fieldsApi, getDuplicateRegistrationError, participantsApi } from '@/services/api';
import { findNingunoStake, getNingunoWardId } from '@/lib/catalog';
import {
  applyNingunoStake,
  inferMemberFromStake,
  isMemberSelected,
  splitMemberField,
  validateMemberStake,
} from '@/lib/member-field';
import type { FieldDefinition, Stake } from '@/types';
import { ageFromBirthDateKey, maxBirthDateForAge, minBirthDateForAge } from '@/lib/mexico-time';

const baseSchema = z.object({
  firstName: z.string().min(2, 'Mínimo 2 caracteres'),
  middleName: z.string().optional(),
  lastName: z.string().min(2, 'Mínimo 2 caracteres'),
  motherLastName: z.string().min(2, 'Mínimo 2 caracteres'),
  birthDate: z.string().min(1, 'Selecciona tu fecha de nacimiento'),
  sex: z.enum(['MALE', 'FEMALE']),
  stakeId: z.string(),
  wardId: z.string(),
}).superRefine((data, ctx) => {
  if (!data.birthDate) return;
  const age = ageFromBirthDateKey(data.birthDate);
  if (age < 18) {
    ctx.addIssue({ code: 'custom', message: 'Debes tener al menos 18 años', path: ['birthDate'] });
  } else if (age > 45) {
    ctx.addIssue({ code: 'custom', message: 'Edad máxima 45 años', path: ['birthDate'] });
  }
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
  const [duplicate, setDuplicate] = useState<{ code: string; fullName: string } | null>(null);
  const [dynamicValues, setDynamicValues] = useState<Record<string, boolean>>({});

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(baseSchema) as Resolver<RegisterFormValues>,
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      motherLastName: '',
      birthDate: '',
      sex: 'MALE',
      stakeId: '',
      wardId: '',
    },
  });

  const stakeId = form.watch('stakeId');
  const birthDate = form.watch('birthDate');
  const computedAge = birthDate ? ageFromBirthDateKey(birthDate) : null;
  const { otherFields } = splitMemberField(fields);
  const isMember = isMemberSelected(dynamicValues);

  const handleMemberChange = (checked: boolean) => {
    setDynamicValues((prev) => ({ ...prev, miembro: checked }));
    if (!checked) {
      const ninguno = applyNingunoStake(stakes);
      if (ninguno) {
        form.setValue('stakeId', ninguno.stakeId);
        form.setValue('wardId', ninguno.wardId);
      }
    } else {
      form.setValue('stakeId', '');
      form.setValue('wardId', '');
    }
  };

  const handleStakeChange = (nextStakeId: string, nextWardId: string) => {
    form.setValue('stakeId', nextStakeId);
    form.setValue('wardId', nextWardId);
  };

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
    setSubmitting(true);
    setDuplicate(null);

    let submitStakeId = data.stakeId;
    let submitWardId = data.wardId;

    if (!isMember) {
      const ninguno = applyNingunoStake(stakes);
      if (ninguno) {
        submitStakeId = ninguno.stakeId;
        submitWardId = ninguno.wardId;
      }
    } else {
      const stakeError = validateMemberStake(stakes, submitStakeId, submitWardId, true);
      if (stakeError) {
        toast.error(stakeError);
        setSubmitting(false);
        return;
      }
    }

    try {
      const participant = await participantsApi.register({
        ...data,
        stakeId: submitStakeId,
        wardId: submitWardId,
        firstName: data.firstName.toUpperCase(),
        middleName: data.middleName?.toUpperCase(),
        lastName: data.lastName.toUpperCase(),
        motherLastName: data.motherLastName.toUpperCase(),
        dynamicFields: dynamicValues,
      });
      navigate('/register/success', { state: { participant } });
    } catch (err) {
      const duplicateInfo = getDuplicateRegistrationError(err);
      if (duplicateInfo) {
        setDuplicate(duplicateInfo);
        return;
      }
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
                  {duplicate && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1 min-w-0">
                          <p className="font-semibold text-foreground">Ya estás registrado</p>
                          <p className="text-sm text-muted-foreground">
                            Encontramos un usuario con el mismo nombre:{' '}
                            <span className="font-medium text-foreground">{duplicate.fullName}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Tu código personal es{' '}
                            <span className="font-mono font-bold text-lg text-leaf-dark tracking-widest">
                              {duplicate.code}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Button asChild className="w-full">
                        <Link to="/credential" state={{ code: duplicate.code }}>
                          Ver mi credencial
                        </Link>
                      </Button>
                    </div>
                  )}

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
                      <Label htmlFor="birthDate">Fecha de nacimiento *</Label>
                      <Input
                        id="birthDate"
                        type="date"
                        min={minBirthDateForAge(45)}
                        max={maxBirthDateForAge(18)}
                        {...form.register('birthDate')}
                      />
                      {computedAge !== null && computedAge >= 18 && computedAge <= 45 && (
                        <p className="text-xs text-muted-foreground">Edad: {computedAge} años</p>
                      )}
                      {form.formState.errors.birthDate && (
                        <p className="text-xs text-red-400">{form.formState.errors.birthDate.message}</p>
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

                  <MemberStakeSection
                    stakes={stakes}
                    isMember={isMember}
                    onMemberChange={handleMemberChange}
                    stakeId={stakeId}
                    wardId={form.watch('wardId')}
                    onStakeChange={handleStakeChange}
                  />

                  {otherFields.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 pt-2 border-t border-border"
                    >
                      <p className="text-sm font-medium text-foreground pt-2">Información adicional</p>
                      {otherFields.map((field) => (
                        <FieldSwitchRow
                          key={field.id}
                          id={field.name}
                          label={field.label}
                          checked={dynamicValues[field.name] ?? false}
                          onCheckedChange={(checked) =>
                            setDynamicValues((prev) => ({ ...prev, [field.name]: checked }))
                          }
                        />
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
