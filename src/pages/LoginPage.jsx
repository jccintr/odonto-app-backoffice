import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client.js';
import Brand from '../components/Brand.jsx';
import { ThemeToggle } from '../components/AppShell.jsx';
import { Alert, Button, Card, Field, Input, PasswordInput } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { admin, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (admin) return <Navigate to={location.state?.from ?? '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err.status === 429 ? `Muitas tentativas. Tente de novo em ${Math.ceil((err.retryAfterSeconds ?? 60) / 60)} min.` : errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <Brand className="mb-6" />
      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-xl font-bold">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Área do dono da plataforma.</p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="E-mail">{({ id }) => <Input id={id} type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
          <Field label="Senha">{({ id }) => <PasswordInput id={id} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}</Field>
          <Button type="submit" size="lg" loading={busy} disabled={!form.email || !form.password}>Entrar</Button>
        </form>
      </Card>
    </div>
  );
}
