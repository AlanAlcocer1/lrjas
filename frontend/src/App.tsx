import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from '@/hooks/useAuth';
import HomePage from '@/pages/HomePage';
import RegisterPage from '@/pages/RegisterPage';
import SuccessPage from '@/pages/SuccessPage';
import CredentialPage from '@/pages/CredentialPage';
import LoginPage from '@/pages/admin/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import UsuariosPage from '@/pages/admin/UsuariosPage';
import CheckInPage from '@/pages/admin/CheckInPage';
import AttendanceTodayPage from '@/pages/admin/AttendanceTodayPage';
import UsersPage from '@/pages/admin/UsersPage';
import FieldsPage from '@/pages/admin/FieldsPage';
import StakesPage from '@/pages/admin/StakesPage';
import DevConsolePage from '@/pages/admin/DevConsolePage';

export default function App() {
  return (
    <AuthProvider>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/success" element={<SuccessPage />} />
          <Route path="/credential" element={<CredentialPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/usuarios" element={<UsuariosPage />} />
          <Route path="/admin/participants" element={<UsuariosPage />} />
          <Route path="/admin/check-in" element={<CheckInPage />} />
          <Route path="/admin/attendance-today" element={<AttendanceTodayPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/fields" element={<FieldsPage />} />
          <Route path="/admin/stakes" element={<StakesPage />} />
          <Route path="/admin/dev" element={<DevConsolePage />} />
        </Routes>
      </AnimatePresence>
    </AuthProvider>
  );
}
