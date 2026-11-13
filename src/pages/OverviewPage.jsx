import { Link } from 'react-router-dom';
import { Platform } from '../api/index.js';
import { Badge, Card, CardHeader, ErrorState, Loading, PageHeader, Stat } from '../components/ui.jsx';
import useResource from '../hooks/useResource.js';
import { BILLING_STATE } from '../lib/billing.js';
import { formatMoney } from '../lib/money.js';

export default function OverviewPage() {
  const res = useResource(() => Platform.overview(), []);
  if (res.loading && !res.data) return <Loading />;
  if (res.error && !res.data) return <ErrorState error={res.error} onRetry={res.reload} />;
  const o = res.data;
  const paying = o.clinics.byState.active + o.clinics.byState.past_due;

  return (
    <>
      <PageHeader title="Visão geral" subtitle="Como está a plataforma hoje." />

      {o.awaitingConfirmation.count > 0 && (
        <Link to="/pagamentos" className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-warning hover:opacity-90">
          <span className="font-medium">{o.awaitingConfirmation.count === 1 ? '1 pagamento aguarda' : `${o.awaitingConfirmation.count} pagamentos aguardam`} a sua conferência ({formatMoney(o.awaitingConfirmation.amountCents)})</span>
          <span className="font-semibold underline">Conferir agora</span>
        </Link>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Receita mensal recorrente" value={formatMoney(o.mrrCents)} hint={`${paying} ${paying === 1 ? 'clínica paga' : 'clínicas pagam'}`} tone="success" />
        <Stat label="Clínicas" value={o.clinics.total} hint={`${o.newLast7Days} nos últimos 7 dias · ${o.newLast30Days} em 30 dias`} />
        <Stat label="Em teste grátis" value={o.clinics.byState.trial} hint="ainda sem pagar" />
        <Stat label="Faturas em aberto" value={o.openInvoices} hint="aguardando pagamento" />
        <Stat label="Suspensas por falta de pagamento" value={o.clinics.byState.suspended + o.clinics.byState.canceled} tone={o.clinics.byState.suspended + o.clinics.byState.canceled > 0 ? 'danger' : undefined} />
        <Stat label="Bloqueadas manualmente" value={o.clinics.suspendedManually} />
        <Stat label="Pedidos de exclusão (LGPD)" value={o.deletionRequests} tone={o.deletionRequests > 0 ? 'danger' : undefined} hint={o.deletionRequests > 0 ? 'precisam de ação sua' : undefined} />
      </div>

      <Card>
        <CardHeader title="Clínicas por situação" />
        <ul className="divide-y divide-border">
          {Object.entries(BILLING_STATE).map(([state, info]) => (
            <li key={state}>
              <Link to={`/clinicas?situacao=${state}`} className="flex items-center justify-between px-4 py-3 hover:bg-surface-2 sm:px-5">
                <Badge tone={info.tone}>{info.label}</Badge>
                <span className="font-semibold">{o.clinics.byState[state]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
