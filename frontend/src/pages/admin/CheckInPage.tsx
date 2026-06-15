import { useEffect, useRef, useState, useCallback } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScanLine,
  Hash,
  Camera,
  CameraOff,
  CheckCircle2,
  UserCheck,
  AlertCircle,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MemberStakeSection } from '@/components/forms/MemberStakeSection';
import { FieldSwitchRow } from '@/components/forms/FieldSwitchRow';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { attendanceApi, catalogApi, participantsApi } from '@/services/api';
import { describeCameraError, startQrScanner, stopQrScanner } from '@/lib/qr-scanner';
import {
  applyNingunoStake,
  inferMemberFromStake,
  isMemberSelected,
  validateMemberStake,
  MEMBER_FIELD_NAME,
} from '@/lib/member-field';
import type { ParticipantCompleteness, Stake } from '@/types';

const CAMERA_PERMISSION_KEY = 'lrjas_camera_granted';

function canAutoStartCamera(): boolean {
  try {
    return sessionStorage.getItem(CAMERA_PERMISSION_KEY) === '1';
  } catch {
    return false;
  }
}

function markCameraGranted() {
  try {
    sessionStorage.setItem(CAMERA_PERMISSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

interface CheckInResult {
  fullName: string;
  code: string;
  alreadyRegistered: boolean;
}

interface PendingCheckIn {
  code: string;
  method: 'QR' | 'MANUAL';
}

export default function CheckInPage() {
  const [mode, setMode] = useState<'qr' | 'manual'>('manual');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingCheckIn, setPendingCheckIn] = useState<PendingCheckIn | null>(null);
  const [incompleteData, setIncompleteData] = useState<ParticipantCompleteness | null>(null);
  const [incompleteStep, setIncompleteStep] = useState<'prompt' | 'form'>('prompt');
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [fillStakeId, setFillStakeId] = useState('');
  const [fillWardId, setFillWardId] = useState('');
  const [fillDynamicFields, setFillDynamicFields] = useState<Record<string, boolean>>({});
  const [savingFields, setSavingFields] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const scannerDivId = 'qr-reader';

  useEffect(() => {
    catalogApi.getStakes().then(setStakes);
  }, []);

  const showCheckInResult = useCallback(
    (res: { alreadyRegistered: boolean; participant: { fullName: string; code: string } }) => {
      setResult({
        fullName: res.participant.fullName,
        code: res.participant.code,
        alreadyRegistered: res.alreadyRegistered,
      });
      if (res.alreadyRegistered) {
        toast.warning('Usuario ya cuenta con asistencia el día de hoy');
      } else {
        toast.success('Asistencia registrada');
      }
      setTimeout(() => setResult(null), 4000);
    },
    [],
  );

  const clearIncompleteFlow = useCallback(() => {
    setPendingCheckIn(null);
    setIncompleteData(null);
    setIncompleteStep('prompt');
    setFillDynamicFields({});
  }, []);

  const performRegister = useCallback(
    async (code: string, method: 'QR' | 'MANUAL') => {
      const res = await attendanceApi.register(code, method);
      showCheckInResult(res);
      clearIncompleteFlow();
    },
    [clearIncompleteFlow, showCheckInResult],
  );

  const initIncompleteForm = useCallback((data: ParticipantCompleteness) => {
    const defaults: Record<string, boolean> = { ...data.profile.dynamicFields };
    data.missing
      .filter((m) => m.type === 'CHECKBOX')
      .forEach((m) => {
        defaults[m.key] = defaults[m.key] ?? false;
      });
    setFillDynamicFields(defaults);

    const isMember = inferMemberFromStake(defaults, data.profile.stake.name);
    if (isMember) {
      defaults[MEMBER_FIELD_NAME] = true;
    }
    if (isMember && data.missing.some((m) => m.type === 'STAKE')) {
      setFillStakeId('');
      setFillWardId('');
    } else {
      setFillStakeId(data.profile.stakeId);
      setFillWardId(data.profile.wardId);
    }
  }, []);

  const registerAttendance = useCallback(
    async (code: string, method: 'QR' | 'MANUAL', skipIncompleteCheck = false) => {
      setSubmitting(true);
      try {
        if (!skipIncompleteCheck) {
          const completeness = await participantsApi.getCompleteness(code);
          if (!completeness.complete) {
            setPendingCheckIn({ code, method });
            setIncompleteData(completeness);
            setIncompleteStep('prompt');
            initIncompleteForm(completeness);
            return;
          }
        }

        await performRegister(code, method);
      } catch {
        toast.error('Usuario no encontrado');
        clearIncompleteFlow();
      } finally {
        setSubmitting(false);
      }
    },
    [clearIncompleteFlow, initIncompleteForm, performRegister],
  );

  const handleSkipIncomplete = async () => {
    if (!pendingCheckIn) return;
    setSubmitting(true);
    try {
      await performRegister(pendingCheckIn.code, pendingCheckIn.method);
    } catch {
      toast.error('No se pudo registrar la asistencia');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveIncompleteAndCheckIn = async () => {
    if (!pendingCheckIn || !incompleteData) return;

    const isMember = isMemberSelected(fillDynamicFields);

    if (isMember) {
      const stakeError = validateMemberStake(stakes, fillStakeId, fillWardId, true);
      if (stakeError) {
        toast.error(stakeError);
        return;
      }
    }

    setSavingFields(true);
    try {
      const payload: {
        stakeId?: string;
        wardId?: string;
        dynamicFields?: Record<string, boolean>;
      } = {};

      if (isMember) {
        payload.stakeId = fillStakeId;
        payload.wardId = fillWardId;
      } else {
        const ninguno = applyNingunoStake(stakes);
        if (ninguno) {
          payload.stakeId = ninguno.stakeId;
          payload.wardId = ninguno.wardId;
        }
      }

      const checkboxKeys = incompleteData.missing
        .filter((m) => m.type === 'CHECKBOX')
        .map((m) => m.key);
      if (checkboxKeys.length > 0) {
        payload.dynamicFields = Object.fromEntries(
          checkboxKeys.map((key) => [key, fillDynamicFields[key] ?? false]),
        );
      }

      await participantsApi.update(incompleteData.participantId, payload);
      toast.success('Datos actualizados');
      setSubmitting(true);
      await performRegister(pendingCheckIn.code, pendingCheckIn.method);
    } catch {
      toast.error('No se pudieron guardar los datos');
    } finally {
      setSavingFields(false);
      setSubmitting(false);
    }
  };

  const stopScanner = useCallback(async () => {
    await stopQrScanner(scannerRef.current, scannerDivId);
    scannerRef.current = null;
    startingRef.current = false;
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (startingRef.current || scannerRef.current?.isScanning) return;

    startingRef.current = true;
    setCameraError(null);

    try {
      await stopQrScanner(scannerRef.current, scannerDivId);
      scannerRef.current = null;

      const scanner = await startQrScanner(scannerDivId, (decoded) => {
        const code = decoded.trim();
        const now = Date.now();
        if (code === lastScanRef.current.code && now - lastScanRef.current.at < 3500) return;
        lastScanRef.current = { code, at: now };
        markCameraGranted();
        registerAttendance(code, 'QR');
      });

      scannerRef.current = scanner;
      markCameraGranted();
      setScanning(true);
    } catch (error) {
      console.error('Camera start error:', error);
      const message = describeCameraError(error);
      setCameraError(message);
      if (!message.includes('denegado')) {
        toast.error(message);
      }
      await stopQrScanner(scannerRef.current, scannerDivId);
      scannerRef.current = null;
      setScanning(false);
    } finally {
      startingRef.current = false;
    }
  }, [registerAttendance]);

  const switchToQr = () => {
    setMode('qr');
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    if (mode !== 'qr') {
      void stopScanner();
      return;
    }

    void startScanner();
  }, [mode, startScanner, stopScanner]);

  const fillIsMember = inferMemberFromStake(fillDynamicFields, incompleteData?.profile.stake.name ?? '');
  const needsMemberSection = incompleteData?.missing.some(
    (m) => m.type === 'STAKE' || m.type === 'WARD' || m.key === MEMBER_FIELD_NAME,
  );
  const otherMissingFields = incompleteData?.missing.filter(
    (m) => m.type === 'CHECKBOX' && m.key !== MEMBER_FIELD_NAME,
  ) ?? [];

  const handleFillMemberChange = (checked: boolean) => {
    setFillDynamicFields((prev) => ({ ...prev, [MEMBER_FIELD_NAME]: checked }));
    if (!checked) {
      const ninguno = applyNingunoStake(stakes);
      if (ninguno) {
        setFillStakeId(ninguno.stakeId);
        setFillWardId(ninguno.wardId);
      }
    } else if (incompleteData?.missing.some((m) => m.type === 'STAKE')) {
      setFillStakeId('');
      setFillWardId('');
    }
  };

  const missingLabels = incompleteData?.missing.map((m) => m.label).join(', ');

  return (
    <AdminLayout>
      <PageTransition>
        <FadeIn>
          <div className="space-y-6 max-w-lg mx-auto lg:max-w-2xl pb-28 lg:pb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">Registro de asistencia</h1>
              <p className="text-sm text-muted-foreground">Escanea QR o ingresa código manual</p>
            </div>

            <div className="flex gap-2 p-1 bg-muted rounded-xl border border-border">
              <Button
                variant={mode === 'qr' ? 'default' : 'ghost'}
                className="flex-1 gap-2"
                onClick={switchToQr}
              >
                <ScanLine className="h-4 w-4" />
                Escanear QR
              </Button>
              <Button
                variant={mode === 'manual' ? 'default' : 'ghost'}
                className="flex-1 gap-2"
                onClick={() => setMode('manual')}
              >
                <Hash className="h-4 w-4" />
                Código manual
              </Button>
            </div>

            {mode === 'qr' && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3 min-h-10">
                    <div className="flex items-center gap-2 text-sm">
                      {scanning ? (
                        <>
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-leaf opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-leaf" />
                          </span>
                          <span className="text-muted-foreground">Cámara activa — apunta al QR</span>
                        </>
                      ) : cameraError ? (
                        <span className="text-red-500">{cameraError}</span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Iniciando cámara…
                        </span>
                      )}
                    </div>
                    {scanning ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void stopScanner()}
                        className="gap-2 shrink-0"
                      >
                        <CameraOff className="h-4 w-4" />
                        Detener
                      </Button>
                    ) : cameraError ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void startScanner()}
                        className="gap-2 shrink-0"
                      >
                        <Camera className="h-4 w-4" />
                        Reintentar
                      </Button>
                    ) : null}
                  </div>

                  <div
                    id={scannerDivId}
                    className="rounded-xl overflow-hidden min-h-[240px] sm:min-h-[280px] bg-black [&_video]:!object-cover [&_video]:!w-full [&_video]:!h-[240px] sm:[&_video]:!h-[280px]"
                  />

                  {!scanning && !cameraError && (
                    <p className="text-xs text-center text-muted-foreground">
                      {canAutoStartCamera()
                        ? 'La cámara se activa sola en esta pestaña.'
                        : 'Al entrar aquí se pedirá permiso de cámara una sola vez.'}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {mode === 'manual' && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex gap-3">
                    <Input
                      placeholder="000"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      className="text-center text-3xl font-mono tracking-[0.5em] h-16"
                      maxLength={3}
                      inputMode="numeric"
                    />
                  </div>
                  <Button
                    className="w-full h-12"
                    disabled={manualCode.length < 1 || submitting}
                    onClick={() => {
                      registerAttendance(manualCode, 'MANUAL');
                      setManualCode('');
                    }}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Registrar asistencia
                  </Button>
                </CardContent>
              </Card>
            )}

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <Card className={result.alreadyRegistered ? 'border-amber-500/40 bg-amber-500/5' : 'border-leaf/30 bg-leaf/5'}>
                    <CardContent className="p-8 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.1 }}
                      >
                        {result.alreadyRegistered ? (
                          <AlertCircle className="h-16 w-16 text-amber-600 mx-auto mb-4" />
                        ) : (
                          <CheckCircle2 className="h-16 w-16 text-leaf-dark mx-auto mb-4" />
                        )}
                      </motion.div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {result.alreadyRegistered
                          ? 'Usuario ya cuenta con asistencia el día de hoy'
                          : 'Bienvenido'}
                      </p>
                      <h2 className="text-2xl font-bold mb-2">{result.fullName}</h2>
                      <Badge variant="success" className="text-base px-4 py-1 font-mono">
                        {result.code}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FadeIn>
      </PageTransition>

      <Dialog
        open={!!incompleteData}
        onOpenChange={(open) => {
          if (!open && !submitting && !savingFields) clearIncompleteFlow();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-amber-600" />
              Datos incompletos
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 pt-1 text-sm text-muted-foreground">
                {incompleteData && (
                  <>
                    <p>
                      <span className="font-semibold text-foreground">{incompleteData.fullName}</span>
                      {' '}(código <span className="font-mono">{incompleteData.code}</span>) tiene información pendiente.
                    </p>
                    {incompleteStep === 'prompt' && missingLabels && (
                      <p>Faltan: {missingLabels}</p>
                    )}
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          {incompleteStep === 'prompt' && (
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
              <Button variant="outline" onClick={() => void handleSkipIncomplete()} disabled={submitting}>
                No, solo registrar asistencia
              </Button>
              <Button onClick={() => setIncompleteStep('form')}>
                Sí, rellenar datos
              </Button>
            </div>
          )}

          {incompleteStep === 'form' && incompleteData && (
            <div className="space-y-4 pt-2">
              {needsMemberSection && (
                <MemberStakeSection
                  stakes={stakes}
                  isMember={fillIsMember}
                  onMemberChange={handleFillMemberChange}
                  stakeId={fillStakeId}
                  wardId={fillWardId}
                  onStakeChange={(nextStakeId, nextWardId) => {
                    setFillStakeId(nextStakeId);
                    setFillWardId(nextWardId);
                  }}
                />
              )}

              {otherMissingFields.map((field) => (
                <FieldSwitchRow
                  key={field.key}
                  id={`checkin-${field.key}`}
                  label={field.label}
                  checked={fillDynamicFields[field.key] ?? false}
                  onCheckedChange={(checked) =>
                    setFillDynamicFields((prev) => ({ ...prev, [field.key]: checked }))
                  }
                />
              ))}

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setIncompleteStep('prompt')}
                  disabled={savingFields}
                >
                  Volver
                </Button>
                <Button
                  onClick={() => void handleSaveIncompleteAndCheckIn()}
                  disabled={savingFields}
                  className="gap-2"
                >
                  {savingFields ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  Guardar y registrar asistencia
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
