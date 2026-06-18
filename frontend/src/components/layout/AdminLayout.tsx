import { Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ScanLine,
  CalendarCheck,
  Settings2,
  Shield,
  LogOut,
  Menu,
  X,
  MapPin,
  Terminal,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const baseNavItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { to: '/admin/check-in', icon: ScanLine, label: 'Check-in' },
  { to: '/admin/attendance-today', icon: CalendarCheck, label: 'Asistencias' },
  { to: '/admin/stakes', icon: MapPin, label: 'Estacas' },
  { to: '/admin/fields', icon: Settings2, label: 'Formularios' },
  { to: '/admin/users', icon: Shield, label: 'Admins' },
];

const devNavItem = { to: '/admin/dev', icon: Terminal, label: 'Dev SQL' };

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-dvh gradient-mesh flex items-center justify-center p-4">
        <div className="space-y-3 w-full max-w-xs">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;

  const navItems =
    user?.username?.toLowerCase() === '000'
      ? [...baseNavItems, devNavItem]
      : baseNavItems;

  const NavLink = ({ to, icon: Icon, label }: (typeof navItems)[0]) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
          active
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-dvh gradient-mesh flex">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border glass fixed inset-y-0 left-0 z-30">
        <div className="flex h-14 items-center gap-2 px-4 border-b border-border">
          <Logo variant="isotipo" />
          <Logo variant="imagotipo" className="h-7" />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground px-3 mb-2 truncate">{user?.name}</p>
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 glass border-b border-border lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link to="/admin" className="flex items-center gap-2">
              <Logo variant="isotipo" />
              <Logo variant="imagotipo" className="h-7" />
            </Link>
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden glass border-b border-border overflow-hidden max-h-[min(70dvh,calc(100dvh-3.5rem))]"
            >
              <div className="p-3 space-y-1 overflow-y-auto max-h-[inherit]">
                {navItems.map((item) => (
                  <NavLink key={item.to} {...item} />
                ))}
                <Button variant="ghost" className="w-full justify-start gap-3 mt-2" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

        <main className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full min-w-0">{children}</main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 glass border-t border-border pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex overflow-x-auto overscroll-x-contain scrollbar-none px-1 py-2 gap-0.5">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex shrink-0 flex-col items-center justify-center gap-0.5 min-w-[4.25rem] max-w-[5.5rem] px-2 py-1.5 text-[10px] font-medium transition-colors rounded-lg',
                  active ? 'text-leaf-dark bg-leaf/10' : 'text-muted-foreground',
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', active && 'text-leaf')} />
                <span className="truncate w-full text-center leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
