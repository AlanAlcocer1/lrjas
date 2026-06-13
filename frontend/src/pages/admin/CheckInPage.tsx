import { useEffect, useRef, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import type { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, Hash, Camera, CameraOff, CheckCircle2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { attendanceApi } from '@/services/api';
import { describeCameraError, startQrScanner, stopQrScanner } from '@/lib/qr-scanner';

interface CheckInResult {
  fullName: string;
  code: string;
  alreadyRegistered: boolean;
}

export default function CheckInPage() {
  const [mode, setMode] = useState<'qr' | 'manual'>('manual');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);
  const scannerDivId = 'qr-reader';

  const registerAttendance = useCallback(async (code: string, method: 'QR' | 'MANUAL') => {
    setSubmitting(true);
    try {
      const res = await attendanceApi.register(code, method);
      setResult({
        fullName: res.participant.fullName,
        code: res.participant.code,
        alreadyRegistered: res.alreadyRegistered,
      });
      if (res.alreadyRegistered) {
        toast.info('Ya registrado hoy');
      } else {
        toast.success('Asistencia registrada');
      }
      setTimeout(() => setResult(null), 4000);
    } catch {
      toast.error('Usuario no encontrado');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const stopScanner = useCallback(async () => {
    await stopQrScanner(scannerRef.current);
    scannerRef.current = null;
    startingRef.current = false;
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (startingRef.current || scanning) return;

    startingRef.current = true;
    setCameraError(null);

    try {
      await stopQrScanner(scannerRef.current);
      scannerRef.current = null;

      const scanner = await startQrScanner(scannerDivId, (decoded) => {
        registerAttendance(decoded.trim(), 'QR');
        void stopScanner();
      });

      scannerRef.current = scanner;
      setScanning(true);
    } catch (error) {
      console.error('Camera start error:', error);
      const message = describeCameraError(error);
      setCameraError(message);
      toast.error(message);
      await stopQrScanner(scannerRef.current);
      scannerRef.current = null;
      setScanning(false);
    } finally {
      startingRef.current = false;
    }
  }, [registerAttendance, scanning, stopScanner]);

  const switchToQr = () => {
    flushSync(() => setMode('qr'));
    void startScanner();
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    if (mode === 'manual') void stopScanner();
  }, [mode, stopScanner]);

  return (
    <AdminLayout>
      <PageTransition>
        <FadeIn>
          <div className="space-y-6 max-w-lg mx-auto lg:max-w-2xl">
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
                  <div id={scannerDivId} className="rounded-xl overflow-hidden min-h-[280px] bg-muted" />
                  {!scanning && !cameraError && (
                    <p className="text-sm text-center text-muted-foreground">
                      Pulsa Iniciar cámara y acepta el permiso cuando el navegador lo pida.
                    </p>
                  )}
                  {cameraError && (
                    <p className="text-sm text-center text-red-500">{cameraError}</p>
                  )}
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={scanning ? () => void stopScanner() : () => void startScanner()}
                      className="gap-2"
                    >
                      {scanning ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                      {scanning ? 'Detener cámara' : 'Iniciar cámara'}
                    </Button>
                  </div>
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
                  <Card className="border-leaf/30 bg-leaf/5">
                    <CardContent className="p-8 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.1 }}
                      >
                        <CheckCircle2 className="h-16 w-16 text-leaf-dark mx-auto mb-4" />
                      </motion.div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {result.alreadyRegistered ? 'Ya registrado hoy' : 'Bienvenido'}
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
    </AdminLayout>
  );
}
