import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import { useAuth } from './context/AuthContext.jsx';
import ClinicPage from './pages/ClinicPage.jsx';
import ClinicsPage from './pages/ClinicsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OverviewPage from './pages/OverviewPage.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import PlansPage from './pages/PlansPage.jsx';

function RequireAuth() {
  const { admin } = useAuth();
  const location = useLocation();
  if (!admin) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <AppShell />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<OverviewPage />} />
        <Route path="pagamentos" element={<PaymentsPage />} />
        <Route path="clinicas" element={<ClinicsPage />} />
        <Route path="clinicas/:id" element={<ClinicPage />} />
        <Route path="planos" element={<PlansPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
