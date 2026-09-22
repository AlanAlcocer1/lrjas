import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Settings,
  ShieldCheck,
  History,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  anyOf?: string[];
};

const primaryNav: NavItem[] = [
  { to: '/', label: 'Inicio', icon: Home, permission: 'activities.view' },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays, permission: 'calendar.view' },
  { to: '/tareas', label: 'Tareas', icon: CheckSquare, permission: 'tasks.view' },
];

const moreNav: NavItem[] = [
  { to: '/actividades', label: 'Actividades', icon: ClipboardList, permission: 'activities.view' },
  { to: '/aprobaciones', label: 'Aprobaciones', icon: ShieldCheck, anyOf: ['approvals.view', 'activities.approve'] },
  { to: '/equipos', label: 'Equipos', icon: UsersRound, permission: 'teams.view' },
  { to: '/usuarios', label: 'Usuarios', icon: Users, permission: 'users.view' },
  { to: '/historial', label: 'Historial', icon: History, permission: 'audit.view' },
  { to: '/configuracion', label: 'Configuración', icon: Settings, anyOf: ['roles.view', 'settings.manage'] },
];

function useFilteredNav(items: NavItem[]) {
  const { hasPermission, hasAnyPermission } = useAuth();
  return items.filter((item) => {
    if (item.anyOf) return hasAnyPermission(...item.anyOf);
    if (item.permission) return hasPermission(item.permission);
    return true;
  });
}

export function AppShell() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const desktopNav = useFilteredNav([...primaryNav, ...moreNav]);
  const mobilePrimary = useFilteredNav(primaryNav);
  const mobileMore = useFilteredNav(moreNav);
  const canCreate = hasPermission('activities.create');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-dvh gradient-mesh flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col border-r border-border bg-card/80 backdrop-blur">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <Logo variant="isotipo" className="h-10 w-10" />
            <div>
              <p className="font-semibold text-foreground leading-tight">LRJAS</p>
              <p className="text-xs text-muted-foreground">Actividades</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {desktopNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-leaf/15 text-leaf-darker'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-3 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground">Código {user?.code}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <header className="md:hidden sticky top-0 z-30 glass px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Logo variant="isotipo" className="h-8 w-8 shrink-0" />
            <span className="font-semibold text-sm truncate">Actividades</span>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-muted shrink-0"
            onClick={() => setMoreOpen(true)}
            aria-label="Menú"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 px-4 py-4 md:px-8 md:py-6 pb-28 md:pb-8 max-w-5xl w-full mx-auto min-w-0">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border safe-bottom">
          <div className="grid grid-cols-4 gap-1 px-2 pt-2 pb-1">
            {mobilePrimary.slice(0, 3).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium',
                    isActive ? 'text-leaf-darker' : 'text-muted-foreground',
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium text-muted-foreground"
            >
              <MoreHorizontal className="h-5 w-5" />
              Más
            </button>
          </div>
        </nav>

        {/* FAB */}
        {canCreate && (
          <button
            type="button"
            onClick={() => navigate('/actividades/nueva')}
            className="md:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-leaf/30 flex items-center justify-center active:scale-95"
            aria-label="Nueva actividad"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}

        {canCreate && (
          <div className="hidden md:block fixed bottom-8 right-8 z-40">
            <Button size="lg" onClick={() => navigate('/actividades/nueva')} className="shadow-lg">
              <Plus className="h-5 w-5" />
              Nueva actividad
            </Button>
          </div>
        )}
      </div>

      {/* Mobile more sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card border-t border-border p-4 safe-bottom md:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">Código {user?.code}</p>
                </div>
                <button type="button" onClick={() => setMoreOpen(false)} className="p-2 rounded-lg hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-1 mb-4">
                {mobileMore.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-muted"
                  >
                    <item.icon className="h-5 w-5 text-leaf-dark" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
