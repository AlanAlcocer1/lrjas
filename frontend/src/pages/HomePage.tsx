import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, QrCode, Shield, ArrowRight, Sparkles } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PageTransition, FadeIn } from '@/components/layout/PageTransition';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { APP_DESCRIPTION } from '@/config/api';

export default function HomePage() {
  return (
    <PublicLayout>
      <PageTransition>
        <div className="space-y-8 pt-4">
          <FadeIn>
            <div className="text-center space-y-5">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="flex justify-center"
              >
                <Logo variant="imagotipo" className="h-16 sm:h-20" />
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full border border-leaf/30 bg-leaf/10 px-3 py-1 text-xs text-leaf-dark"
              >
                <Sparkles className="h-3 w-3 text-leaf" />
                Registro digital
              </motion.div>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                {APP_DESCRIPTION}. Regístrate una vez y accede a todas las actividades con tu código personal.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link to="/register" className="block group">
                <Card className="h-full transition-all duration-300 hover:border-leaf/40 hover:shadow-md hover:shadow-leaf/10 group-hover:-translate-y-0.5">
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf/10 border border-leaf/25">
                      <UserPlus className="h-5 w-5 text-leaf-dark" />
                    </div>
                    <div>
                      <h2 className="font-semibold mb-1">Registrarme</h2>
                      <p className="text-xs text-muted-foreground">Completa tu registro y obtén tu código personal</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-leaf-dark group-hover:translate-x-1 transition-all ml-auto" />
                  </CardContent>
                </Card>
              </Link>

              <Link to="/credential" className="block group">
                <Card className="h-full transition-all duration-300 hover:border-leaf/40 hover:shadow-md hover:shadow-leaf/10 group-hover:-translate-y-0.5">
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf-dark/10 border border-leaf-dark/20">
                      <QrCode className="h-5 w-5 text-leaf-darker" />
                    </div>
                    <div>
                      <h2 className="font-semibold mb-1">Mi credencial</h2>
                      <p className="text-xs text-muted-foreground">Consulta tu código y descarga tu QR</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-leaf-dark group-hover:translate-x-1 transition-all ml-auto" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="text-center pt-2">
              <Link to="/admin/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                  <Shield className="h-3.5 w-3.5" />
                  Acceso administrador
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </PageTransition>
    </PublicLayout>
  );
}
