import { Link, Outlet } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';

export function PublicLayout() {
  return (
    <div className="min-h-dvh gradient-mesh flex flex-col">
      <header className="sticky top-0 z-20 glass px-4 py-3 flex items-center justify-between">
        <Link to="/public" className="flex items-center gap-2">
          <Logo variant="isotipo" className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold leading-tight">LRJAS Actividades</p>
            <p className="text-[11px] text-muted-foreground">Ver actividades</p>
          </div>
        </Link>
        <Link
          to="/login"
          className="text-sm font-medium text-leaf-dark hover:text-leaf-darker"
        >
          Entrar
        </Link>
      </header>
      <main className="flex-1 px-4 py-6 max-w-3xl w-full mx-auto min-w-0">
        <Outlet />
      </main>
      <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
        Lugar de Reunión JAS · Mérida
      </footer>
    </div>
  );
}
