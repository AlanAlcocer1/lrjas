import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WalletPassButtons } from '@/components/credential/WalletPassButtons';
import { API_URL } from '@/config/api';
import { getApiErrorMessage, walletPassesApi } from '@/services/api';
import type { WalletPassInfo } from '@/types';

type Props = {
  code: string;
};

export function WalletPassSection({ code }: Props) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [pass, setPass] = useState<WalletPassInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPass(null);
    walletPassesApi
      .get(code)
      .then((res) => {
        if (!cancelled && res.exists) setPass(res.pass);
      })
      .catch(() => {
        /* sin pase aún */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const createPass = async () => {
    setCreating(true);
    try {
      const res = await walletPassesApi.create(code);
      setPass(res.pass);
      toast.success(res.created ? 'Pase generado' : 'Ya tenías un pase');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'No se pudo generar el pase'));
    } finally {
      setCreating(false);
    }
  };

  const addApple = () => {
    if (!pass) return;
    if (pass.hasApplePass) {
      // Descarga .pkpass (Safari en iPhone lo abre en Wallet)
      window.location.href = `${API_URL}/wallet-passes/code/${encodeURIComponent(code)}/apple.pkpass`;
      return;
    }
    window.open(`${pass.shareUrl}${pass.shareUrl.includes('?') ? '&' : '?'}lang=es`, '_blank', 'noopener,noreferrer');
  };

  const addGoogle = () => {
    if (!pass) return;
    const url = pass.googleSaveUrl || `${pass.shareUrl}${pass.shareUrl.includes('?') ? '&' : '?'}lang=es`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <WalletCards className="h-5 w-5 text-leaf-dark" />
          Pase en la cartera
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Genera tu pase digital LRJAS y añádelo a Apple Wallet o Google Wallet para llevar tu
          código de asistencia siempre a la mano.
        </p>

        {loading ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !pass ? (
          <Button onClick={createPass} disabled={creating} className="w-full gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <WalletCards className="h-4 w-4" />}
            Generar mi pase
          </Button>
        ) : (
          <div className="space-y-3">
            <WalletPassButtons
              onApple={addApple}
              onGoogle={addGoogle}
              showGoogle={Boolean(pass.googleSaveUrl || pass.shareUrl)}
              showApple
            />
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() =>
                window.open(
                  `${pass.shareUrl}${pass.shareUrl.includes('?') ? '&' : '?'}lang=es`,
                  '_blank',
                  'noopener,noreferrer',
                )
              }
            >
              <ExternalLink className="h-4 w-4" />
              Abrir página de instalación
            </Button>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              En iPhone usa Safari para Apple Wallet. En Android, Chrome para Google Wallet. En
              escritorio la página muestra un QR.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
