import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, QrCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Logo } from '@/components/brand/Logo';
import { downloadCredentialPng, generateQrDataUrl } from '@/lib/credential';
import type { Participant } from '@/types';

interface CredentialCardProps {
  participant: Participant;
  animated?: boolean;
}

export function CredentialCard({ participant, animated = true }: CredentialCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loadingQr, setLoadingQr] = useState(true);

  useEffect(() => {
    setLoadingQr(true);
    generateQrDataUrl(participant.code)
      .then(setQrDataUrl)
      .catch(() => toast.error('Error al generar QR'))
      .finally(() => setLoadingQr(false));
  }, [participant.code]);

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `lrjas-${participant.code}.png`;
    link.href = qrDataUrl;
    link.click();
    toast.success('QR descargado');
  };

  const downloadCredential = () => {
    downloadCredentialPng(participant)
      .then(() => toast.success('Credencial descargada'))
      .catch(() => toast.error('No se pudo descargar la credencial'));
  };

  const content = (
    <Card className="overflow-hidden border-leaf/20 w-full max-w-sm">
      <div className="h-28 bg-gradient-to-br from-leaf/15 via-transparent to-leaf-dark/10 flex items-center justify-center px-6 pt-4">
        <Logo variant="imagotipo" className="h-12 w-auto max-w-[220px]" />
      </div>
      <CardContent className="px-6 pb-8 pt-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">{participant.fullName}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {participant.stake.name} · {participant.ward.name}
          </p>
        </div>

        <div className="flex justify-center mb-2">
          <div className="rounded-2xl bg-white p-4 border border-border shadow-sm">
            {loadingQr ? (
              <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <img src={qrDataUrl} alt={`QR ${participant.code}`} className="w-48 h-48 sm:w-56 sm:h-56" />
            )}
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Código personal</p>
          <p className="text-4xl font-bold font-mono tracking-[0.25em] text-leaf-dark leading-none">{participant.code}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={downloadQR} disabled={!qrDataUrl} className="gap-2">
            <Download className="h-4 w-4" />
            Descargar QR
          </Button>
          <Button onClick={downloadCredential} className="gap-2">
            <QrCode className="h-4 w-4" />
            Descargar credencial
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (!animated) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {content}
    </motion.div>
  );
}
