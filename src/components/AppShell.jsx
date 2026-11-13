import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import Brand from './Brand.jsx';
import Icon from './Icon.jsx';
import { IconButton, cx } from './ui.jsx';

const NAV = [
  { to: '/', label: 'Visão geral', icon: 'home', end: true },
  { to: '/pagamentos', label: 'Pagamentos', icon: 'wallet' },
  { to: '/clinicas', label: 'Clínicas', icon: 'users' },
  { to: '/planos', label: 'Planos', icon: 'coin' },
];

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} onClick={toggle} />;
}

const linkClass = ({ isActive }) => cx('flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition', isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-text');

export default function AppShell() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const leave = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Brand className="px-2" />
        <nav className="flex flex-1 flex-col gap-1" aria-label="Menu principal">
          {NAV.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}><Icon name={item.icon} className="size-5" />{item.label}</NavLink>)}
        </nav>
        <div className="border-t border-border pt-3">
          <p className="truncate px-3 text-sm font-medium">{admin.name}</p>
          <p className="truncate px-3 text-xs text-muted">{admin.email}</p>
          <button onClick={leave} className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text"><Icon name="logout" className="size-5" />Sair</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-surface/90 px-4 py-2.5 backdrop-blur lg:px-8">
          <div className="min-w-0 flex-1 lg:hidden"><Brand /></div>
          <div className="hidden flex-1 lg:block" />
          <ThemeToggle />
          <IconButton icon="logout" label="Sair" className="lg:hidden" onClick={leave} />
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-1 lg:hidden" aria-label="Menu">
          {NAV.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}><Icon name={item.icon} className="size-4" />{item.label}</NavLink>)}
        </nav>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
