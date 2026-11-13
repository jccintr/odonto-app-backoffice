// Em desenvolvimento VITE_API_URL fica vazio e o Vite faz proxy de /api. Em produção aponte para a API.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const TOKEN_KEY = 'odonto-backoffice:token';

export class ApiError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = extra.code;
    this.details = extra.details;
    this.retryAfterSeconds = extra.retryAfterSeconds;
  }
}

const read = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const write = (token) => { try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch { /* sem armazenamento: a sessão dura só até recarregar */ } };

export const getToken = () => read();
export const hasSession = () => Boolean(read());
export const setToken = (token) => write(token);

let onUnauthorized;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

const queryString = (query) => {
  const entries = Object.entries(query ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : '';
};

/** Chamada à API da plataforma. O token do dono vale por 12 h; se a API recusar (401), a sessão é encerrada. */
export async function request(path, { method = 'GET', body, query, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = read();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}${queryString(query)}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique a internet e tente novamente.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && auth) { write(null); onUnauthorized?.(); }
    throw new ApiError(res.status, data?.error ?? 'Não foi possível concluir a operação.', data ?? {});
  }
  return data;
}

/** mensagem amigável: erros de validação (400 com details) viram uma frase só */
export function errorMessage(err) {
  if (err?.details?.length) return err.details.map((d) => d.message).join(' · ');
  return err?.message ?? 'Algo deu errado.';
}

/** erros de campo da API ({ details: [{ field, message }] }) → { campo: mensagem } */
export function fieldErrors(err) {
  return Object.fromEntries((err?.details ?? []).map((d) => [d.field, d.message]));
}
