import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { GuestRoute, ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ActivitiesPage } from '@/pages/ActivitiesPage';
import { NewActivityPage } from '@/pages/NewActivityPage';
import { ActivityDetailPage } from '@/pages/ActivityDetailPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { TasksPage } from '@/pages/TasksPage';
import { ApprovalsPage } from '@/pages/ApprovalsPage';
import { TeamsPage } from '@/pages/TeamsPage';
import { UsersPage } from '@/pages/UsersPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AuditPage } from '@/pages/AuditPage';
import { PublicAgendaPage } from '@/pages/PublicAgendaPage';
import { PublicDetailPage } from '@/pages/PublicDetailPage';

function LegacyPublicDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/evento/${id}` : '/'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Agenda pública = home del subdominio */}
        <Route element={<PublicLayout />}>
          <Route index element={<PublicAgendaPage />} />
          <Route path="evento/:id" element={<PublicDetailPage />} />
        </Route>

        {/* Compatibilidad con links viejos /public */}
        <Route path="public" element={<Navigate to="/" replace />} />
        <Route path="public/:id" element={<LegacyPublicDetailRedirect />} />

        <Route element={<GuestRoute />}>
          <Route path="login" element={<LoginPage />} />
        </Route>

        {/* Panel del comité */}
        <Route path="app" element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="actividades" element={<ActivitiesPage />} />
            <Route path="actividades/nueva" element={<NewActivityPage />} />
            <Route path="actividades/:id" element={<ActivityDetailPage />} />
            <Route path="calendario" element={<CalendarPage />} />
            <Route path="tareas" element={<TasksPage />} />
            <Route path="aprobaciones" element={<ApprovalsPage />} />
            <Route path="equipos" element={<TeamsPage />} />
            <Route path="usuarios" element={<UsersPage />} />
            <Route path="historial" element={<AuditPage />} />
            <Route path="configuracion" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
