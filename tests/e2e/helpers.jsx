import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { inject } from 'vitest';
import { setToken } from '../../src/api/client.js';
import App from '../../src/App.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { ThemeProvider } from '../../src/context/ThemeContext.jsx';
import { UIProvider } from '../../src/context/UIContext.jsx';

export const demo = () => inject('demo');
export const user = () => userEvent.setup();
export { screen, waitFor, within };

export function renderApp(path = '/') {
  cleanup();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider><UIProvider><AuthProvider><App /></AuthProvider></UIProvider></ThemeProvider>
    </MemoryRouter>,
  );
}

const post = async (path, body, token) => {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`POST ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
};

/** Entra como dono da plataforma sem passar pela tela (guarda o token e os dados, como depois de um login). */
export async function loginPlatform() {
  const { email, password } = demo().platform;
  const session = await post('/api/platform/login', { email, password });
  setToken(session.token);
  localStorage.setItem('odonto-backoffice:admin', JSON.stringify(session.admin));
  return session;
}

/** A clínica de demonstração escolhe um plano e avisa que pagou (o que a clínica faria no app dela). */
export async function clinicReportsPayment(note = 'Pix das 10h') {
  const session = await post('/api/auth/login', { email: demo().admin.email, password: demo().admin.password });
  const get = (path) => fetch(path, { headers: { authorization: `Bearer ${session.accessToken}` } }).then((r) => r.json());
  const { plans } = await get('/api/billing');
  const chosen = await post('/api/billing/plan', { planId: plans[1].id }, session.accessToken);
  await post(`/api/billing/invoices/${chosen.invoice.id}/reported`, { note }, session.accessToken);
  return { session, status: () => get('/api/billing/status') };
}
