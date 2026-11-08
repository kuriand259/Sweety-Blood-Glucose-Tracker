import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AppShellLayout } from './components/AppShellLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReadingsPage } from './pages/ReadingsPage';
import { ReportsPage } from './pages/ReportsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShellLayout />}>
              <Route path="/readings" element={<ReadingsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/readings" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
