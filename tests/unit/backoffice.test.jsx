import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, errorMessage, fieldErrors, getToken, hasSession, request, setToken, setUnauthorizedHandler } from '../../src/api/client.js';
import { AuthProvider, useAuth } from '../../src/context/AuthContext.jsx';
import { ThemeProvider, useTheme } from '../../src/context/ThemeContext.jsx';
import {
  BILLING_STATE, CLINIC_STATUS, EVENT_LABEL, TEMPLATE_LABEL, actorLabel, attentionFor, parsePriceCents, pluralDays, remaining,
} from '../../src/lib/billing.js';

const Platform = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock('../../src/api/index.js', () => ({ Platform }));

const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
let fetchMock;
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); setUnauthorizedHandler(null); });
afterEach(() => vi.unstubAllGlobals());

describe('lib/billing', () => {
  it('rótulos e plural', () => {
    expect(Object.keys(BILLING_STATE)).toEqual(['trial', 'active', 'courtesy', 'past_due', 'suspended', 'canceled']);
    expect(CLINIC_STATUS.suspended.label).toBe('Bloqueada');
    expect(TEMPLATE_LABEL.orthodontics).toBe('Ortodontia');
    expect(EVENT_LABEL.invoice_paid).toBe('Pagamento confirmado');
    expect(pluralDays(1)).toBe('1 dia');
    expect(pluralDays(2)).toBe('2 dias');
  });

  it('quanto falta ou quanto atrasou', () => {
    expect(remaining({ daysLeft: null })).toBe('sem prazo');
    expect(remaining({ daysLeft: 0 })).toBe('vence hoje');
    expect(remaining({ daysLeft: 1 })).toBe('faltam 1 dia');
    expect(remaining({ daysLeft: 9 })).toBe('faltam 9 dias');
    expect(remaining({ daysLeft: -3 })).toBe('venceu há 3 dias');
  });

  it('o que pede atenção do dono, em ordem de gravidade', () => {
    const clinic = (state, extra = {}, status = 'active') => ({ status, subscription: { state, deletionRequestedAt: null, ...extra } });
    expect(attentionFor(clinic('trial', { deletionRequestedAt: '2026-11-01T10:00:00Z' }, 'suspended')).label).toMatch(/exclusão/);
    expect(attentionFor(clinic('suspended')).tone).toBe('danger');
    expect(attentionFor(clinic('canceled')).label).toMatch(/suspenso/);
    expect(attentionFor(clinic('past_due'))).toEqual({ tone: 'warning', label: 'Pagamento em atraso' });
    expect(attentionFor(clinic('active', {}, 'suspended')).label).toBe('Bloqueada manualmente');
    expect(attentionFor(clinic('trial'))).toBeNull();
  });

  it.each([['149', 14900], ['149,9', 14990], ['149,90', 14990], ['1.249,90', 124990], ['R$ 79', 7900], ['  79,00 ', 7900], ['1000', 100000]])('preço %s = %i centavos', (text, cents) => {
    expect(parsePriceCents(text)).toBe(cents);
  });

  it.each(['', 'abc', '1.2.3', '12,345', '-5', '1,2,3', '12.34'])('preço inválido: "%s"', (text) => {
    expect(parsePriceCents(text)).toBeNull();
  });

  it('quem fez cada evento', () => {
    expect(actorLabel(null)).toBe('Sistema');
    expect(actorLabel('system')).toBe('Sistema');
    expect(actorLabel('platform:abc')).toBe('Você (plataforma)');
    expect(actorLabel('clinic:abc')).toBe('Clínica');
  });
});

describe('cliente da API', () => {
  it('envia o token e o corpo, monta a query sem vazios e devolve o JSON', async () => {
    setToken('tok');
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    expect(await request('/api/x', { method: 'POST', body: { a: 1 }, query: { q: 'ana', vazio: '', nulo: null, n: 0 } })).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/x?q=ana&n=0');
    expect(init).toMatchObject({ method: 'POST', body: '{"a":1}', headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' } });
  });

  it('sem token, sem corpo e sem autenticação (login)', async () => {
    fetchMock.mockResolvedValue(json(200, {}));
    await request('/api/y');
    expect(fetchMock.mock.calls[0][1].headers).toEqual({});
    setToken('tok');
    await request('/api/platform/login', { auth: false, method: 'POST', body: {} });
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it('204 vem sem corpo', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 });
    expect(await request('/api/z')).toBeNull();
  });

  it('erro da API vira ApiError com código e detalhes; sem mensagem usa a padrão', async () => {
    fetchMock.mockResolvedValue(json(409, { error: 'Já existe.', code: 'X', details: [{ field: 'a', message: 'ruim' }], retryAfterSeconds: 5 }));
    await expect(request('/api/x')).rejects.toMatchObject({ status: 409, message: 'Já existe.', code: 'X', retryAfterSeconds: 5 });
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('html'); } });
    await expect(request('/api/x')).rejects.toThrow('Não foi possível concluir a operação.');
  });

  it('sem rede: ApiError de status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('falhou'));
    await expect(request('/api/x')).rejects.toMatchObject({ status: 0 });
  });

  it('401 com sessão encerra o acesso e avisa; no login (sem auth) não', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    setToken('tok');
    fetchMock.mockResolvedValue(json(401, { error: 'Não autorizado.' }));
    await expect(request('/api/x')).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(hasSession()).toBe(false);

    await expect(request('/api/platform/login', { auth: false })).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledTimes(1);
    setUnauthorizedHandler(null);
    setToken('tok');
    await expect(request('/api/x')).rejects.toMatchObject({ status: 401 }); // sem ninguém ouvindo, sai normalmente
  });

  it('mensagens de erro e erros por campo', () => {
    expect(errorMessage(new ApiError(400, 'x', { details: [{ message: 'a' }, { message: 'b' }] }))).toBe('a · b');
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage(null)).toBe('Algo deu errado.');
    expect(fieldErrors({ details: [{ field: 'email', message: 'ruim' }] })).toEqual({ email: 'ruim' });
    expect(fieldErrors(null)).toEqual({});
  });

  it('armazenamento bloqueado: não quebra', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('bloqueado'); });
    expect(getToken()).toBeNull();
    expect(() => setToken('a')).not.toThrow();
    expect(() => setToken(null)).not.toThrow();
    [get, set, remove].forEach((spy) => spy.mockRestore());
  });
});

describe('sessão do dono', () => {
  function Probe() {
    const { admin, login, logout } = useAuth();
    return <><p>{admin ? admin.name : 'fora'}</p><button onClick={() => login('a@b.com', 'senha')}>entrar</button><button onClick={logout}>sair</button></>;
  }

  it('entra, guarda o acesso e sai', async () => {
    const u = userEvent.setup();
    Platform.login.mockResolvedValue({ token: 'jwt', admin: { id: '1', name: 'Dono', email: 'a@b.com' } });
    const { unmount } = render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText('fora')).toBeInTheDocument();
    await u.click(screen.getByText('entrar'));
    expect(await screen.findByText('Dono')).toBeInTheDocument();
    expect(getToken()).toBe('jwt');
    unmount();

    render(<AuthProvider><Probe /></AuthProvider>); // recarregar a página: continua entrado
    expect(screen.getByText('Dono')).toBeInTheDocument();
    await u.click(screen.getByText('sair'));
    expect(screen.getByText('fora')).toBeInTheDocument();
    expect(hasSession()).toBe(false);
  });

  it('token sem dados do dono guardados, ou dados corrompidos, começa fora; 401 da API derruba a sessão', async () => {
    setToken('jwt');
    localStorage.setItem('odonto-backoffice:admin', '{quebrado');
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText('fora')).toBeInTheDocument();
  });

  it('um 401 no meio do uso desloga', async () => {
    const u = userEvent.setup();
    Platform.login.mockResolvedValue({ token: 'jwt', admin: { id: '1', name: 'Dono', email: 'a@b.com' } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await u.click(screen.getByText('entrar'));
    await screen.findByText('Dono');
    fetchMock.mockResolvedValue(json(401, { error: 'x' }));
    await act(async () => { await request('/api/x').catch(() => {}); });
    expect(screen.getByText('fora')).toBeInTheDocument();
  });

  it('armazenamento bloqueado: entra mesmo assim', async () => {
    const u = userEvent.setup();
    Platform.login.mockResolvedValue({ token: 'jwt', admin: { id: '1', name: 'Dono', email: 'a@b.com' } });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('bloqueado'); });
    render(<AuthProvider><Probe /></AuthProvider>);
    await u.click(screen.getByText('entrar'));
    expect(await screen.findByText('Dono')).toBeInTheDocument();
    await u.click(screen.getByText('sair'));
    expect(screen.getByText('fora')).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

describe('tema', () => {
  function Host() { const { theme, toggle, setTheme } = useTheme(); return <><button onClick={toggle}>{theme}</button><button onClick={() => setTheme('dark')}>escuro</button></>; }

  it('começa pelo que o aparelho prefere, lembra a escolha e alterna nos dois sentidos', async () => {
    const u = userEvent.setup();
    window.matchMedia = (query) => ({ matches: query.includes('dark'), media: query, addEventListener() {}, removeEventListener() {} });
    render(<ThemeProvider><Host /></ThemeProvider>);
    const toggle = screen.getByRole('button', { name: /dark|light/ });
    expect(toggle).toHaveTextContent('dark');
    expect(document.documentElement).toHaveClass('dark');
    await u.click(toggle);
    expect(toggle).toHaveTextContent('light');
    expect(localStorage.getItem('odonto-backoffice:theme')).toBe('light');
    await u.click(toggle);
    expect(toggle).toHaveTextContent('dark');
  });

  it('a escolha salva vence; sem armazenamento nem matchMedia usa o claro e não quebra', async () => {
    localStorage.setItem('odonto-backoffice:theme', 'light');
    window.matchMedia = (query) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} });
    const { unmount } = render(<ThemeProvider><Host /></ThemeProvider>);
    expect(screen.getByRole('button', { name: 'light' })).toBeInTheDocument();
    unmount();

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    window.matchMedia = undefined;
    const u = userEvent.setup();
    render(<ThemeProvider><Host /></ThemeProvider>);
    expect(screen.getByRole('button', { name: 'light' })).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'escuro' }));
    vi.restoreAllMocks();
  });
});
