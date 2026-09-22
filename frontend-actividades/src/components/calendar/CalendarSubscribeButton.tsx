import { useState } from 'react';
import { CalendarPlus, Check, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { activitiesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function toWebcal(httpsUrl: string) {
  return httpsUrl.replace(/^https?:\/\//i, 'webcal://');
}

function googleSubscribeUrl(icsHttpsUrl: string) {
  // Google acepta cid= con URL https o webcal
  const cid = encodeURIComponent(icsHttpsUrl);
  return `https://calendar.google.com/calendar/r?cid=${cid}`;
}

type CalendarSubscribeButtonProps = {
  className?: string;
  size?: 'default' | 'sm';
  variant?: 'default' | 'outline' | 'secondary';
};

export function CalendarSubscribeButton({
  className,
  size = 'sm',
  variant = 'outline',
}: CalendarSubscribeButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const icsUrl = activitiesApi.publicCalendarIcsUrl();
  const webcalUrl = toWebcal(icsUrl);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(icsUrl);
      setCopied(true);
      toast.success('Enlace copiado');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar. Copia el enlace a mano.');
    }
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn('shrink-0', className)}
        onClick={() => setOpen(true)}
      >
        <CalendarPlus className="h-4 w-4" />
        Sincronizar calendario
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sincronizar con tu calendario</DialogTitle>
            <DialogDescription>
              Suscríbete al feed de actividades aprobadas. Se actualiza solo en Google,
              iPhone y Outlook (solo lectura).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <Button asChild className="w-full justify-center">
              <a href={googleSubscribeUrl(icsUrl)} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Abrir en Google Calendar
              </a>
            </Button>

            <Button asChild variant="secondary" className="w-full justify-center">
              <a href={webcalUrl}>
                <CalendarPlus className="h-4 w-4" />
                Apple / iPhone / Outlook
              </a>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full justify-center"
              onClick={copyLink}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar enlace ICS'}
            </Button>

            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Enlace del calendario</p>
              <p className="text-[11px] break-all font-mono text-foreground/80 leading-relaxed">
                {icsUrl}
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5 pt-1 list-disc pl-4">
                <li>
                  <strong className="font-medium text-foreground">Google:</strong> Otros
                  calendarios → Desde URL → pega el enlace.
                </li>
                <li>
                  <strong className="font-medium text-foreground">iPhone:</strong> Ajustes →
                  Calendario → Cuentas → Añadir → Otra → Calendario con suscripción.
                </li>
                <li>
                  En local (`localhost`) la suscripción suele fallar; en producción con HTTPS
                  funciona bien.
                </li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
