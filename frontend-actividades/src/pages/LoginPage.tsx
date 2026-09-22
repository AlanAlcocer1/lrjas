import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/utils';

const ACCESS_DENIED_MSG = 'No tienes permisos de acceder aquí mi chavo';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [deniedOpen, setDeniedOpen] = useState(false);
  const [deniedMessage, setDeniedMessage] = useState(ACCESS_DENIED_MSG);
  const from = (location.state as { from?: string } | null)?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!/^\d+$/.test(trimmed)) {
      setDeniedMessage('Ingresa solo tu código numérico');
      setDeniedOpen(true);
      return;
    }
    setLoading(true);
    try {
      await login(trimmed);
      toast.success('¡Bienvenido!');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = getErrorMessage(err, ACCESS_DENIED_MSG);
      setDeniedMessage(msg || ACCESS_DENIED_MSG);
      setDeniedOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh gradient-mesh flex flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Logo className="h-14 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Actividades</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ingresa con tu código de participante
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Input
              id="code"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              autoFocus
              placeholder="Ej. 042"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="h-14 text-center text-2xl tracking-[0.3em] font-semibold"
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading || code.length < 1}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Entrar
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link to="/public" className="text-leaf-dark hover:underline">
            Ver agenda pública
          </Link>
        </p>
      </motion.div>

      <Dialog open={deniedOpen} onOpenChange={setDeniedOpen}>
        <DialogContent className="max-w-sm text-center sm:text-center">
          <DialogHeader className="items-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/25 mx-auto">
              <ShieldAlert className="h-7 w-7 text-amber-700" />
            </div>
            <DialogTitle className="text-center text-xl">Sin acceso</DialogTitle>
            <DialogDescription className="text-center text-base text-foreground leading-relaxed">
              {deniedMessage}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground px-2">
            Si crees que deberías entrar, pide a un admin que te asigne un rol en Actividades.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <Button className="w-full" onClick={() => setDeniedOpen(false)}>
              Entendido
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/public" onClick={() => setDeniedOpen(false)}>
                Ver agenda pública
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
