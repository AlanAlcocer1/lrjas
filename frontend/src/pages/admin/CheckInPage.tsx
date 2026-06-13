import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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

interface CheckInResult {
  fullName: string;
  code: string;
  alreadyRegistered: boolean;
}

export default function CheckInPage() {
  const [mode, setMode] = useState<'qr' | 'manual'>('manual');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
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

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          registerAttendance(decoded.trim(), 'QR');
          stopScanner();
        },
        () => {},
      );
      setScanning(true);
    } catch {
      toast.error('No se pudo acceder a la cámara');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  useEffect(() => {
    if (mode === 'qr' && !scanning) startScanner();
    if (mode === 'manual') stopScanner();
  }, [mode]);

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
                onClick={() => setMode('qr')}
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
                <CardContent className="p-4">
                  <div id={scannerDivId} className="rounded-xl overflow-hidden min-h-[280px] bg-muted" />
                  <div className="flex justify-center mt-4">
                    <Button variant="outline" onClick={scanning ? stopScanner : startScanner} className="gap-2">
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
