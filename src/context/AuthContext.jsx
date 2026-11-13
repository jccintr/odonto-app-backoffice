import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hasSession, setToken, setUnauthorizedHandler } from '../api/client.js';
import { Platform } from '../api/index.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

const KEY = 'odonto-backoffice:admin';
const readAdmin = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const writeAdmin = (admin) => { try { if (admin) localStorage.setItem(KEY, JSON.stringify(admin)); else localStorage.removeItem(KEY); } catch { /* ignora */ } };

/** Sessão do dono da plataforma: o token fica no navegador e a API valida a cada chamada. */
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => (hasSession() ? readAdmin() : null));

  useEffect(() => { setUnauthorizedHandler(() => { writeAdmin(null); setAdmin(null); }); return () => setUnauthorizedHandler(null); }, []);

  const value = useMemo(() => ({
    admin,
    async login(email, password) {
      const session = await Platform.login(email, password);
      setToken(session.token);
      writeAdmin(session.admin);
      setAdmin(session.admin);
    },
    logout() { setToken(null); writeAdmin(null); setAdmin(null); },
  }), [admin]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
