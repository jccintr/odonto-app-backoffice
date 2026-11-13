import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Platform } from '../api/index.js';
import ConfirmPaymentModal from '../components/ConfirmPaymentModal.jsx';
import { Badge, Button, Card, EmptyState, ErrorState, Loading, PageHeader, Pagination, Table, Tabs } from '../components/ui.jsx';
import { useUI } from '../context/UIContext.jsx';
import useResource from '../hooks/useResource.js';
import { dayOf, formatDay } from '../lib/dates.js';
import { formatMoney } from '../lib/money.js';

const TABS = {
  awaiting: { label: 'Aguardando conferência', query: { status: 'OPEN', reported: true }, empty: 'Nenhum pagamento esperando conferência.' },
  open: { label: 'Em aberto', query: { status: 'OPEN' }, empty: 'Nenhuma fatura em aberto.' },
  paid: { label: 'Pagas', query: { status: 'PAID' }, empty: 'Nenhum pagamento confirmado ainda.' },
};

export default function PaymentsPage() {
  const ui = useUI();
  const [tab, setTab] = useState('awaiting');
  const [page, setPage] = useState(1);
  const [confirming, setConfirming] = useState(null);
  const res = useResource(() => Platform.invoices({ ...TABS[tab].query, page, perPage: 20 }), [tab, page]);

  const changeTab = (next) => { setTab(next); setPage(1); };
  const done = async () => { setConfirming(null); await res.reload(); ui.success('Pagamento confirmado. O acesso da clínica foi liberado.'); };

  return (
    <>
      <PageHeader title="Pagamentos" subtitle="Confira o Pix na sua conta e confirme a fatura para liberar a clínica." />
      <Card>
        <div className="px-2"><Tabs value={tab} onChange={changeTab} tabs={Object.entries(TABS).map(([id, t]) => ({ id, label: t.label }))} /></div>
        {res.loading && !res.data ? <Loading /> : res.error ? <div className="p-4"><ErrorState error={res.error} onRetry={res.reload} /></div> : res.data.data.length === 0 ? (
          <EmptyState icon="wallet" title={TABS[tab].empty} />
        ) : (
          <>
            <Table head={['Clínica', 'Período', 'Valor', tab === 'paid' ? 'Pago em' : 'Vencimento', tab === 'paid' ? 'Observação' : 'Aviso da clínica', { label: '', right: true }]}>
              {res.data.data.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-3 font-medium"><Link to={`/clinicas/${i.clinicId}`} className="text-primary hover:underline">{i.clinicName}</Link></td>
                  <td className="px-4 py-3">{formatDay(i.periodStart)} a {formatDay(i.periodEnd)}</td>
                  <td className="px-4 py-3">{formatMoney(i.amountCents)}</td>
                  <td className="px-4 py-3">{tab === 'paid' ? formatDay(dayOf(i.paidAt)) : formatDay(i.dueOn)}</td>
                  <td className="px-4 py-3">
                    {tab === 'paid' ? (i.paymentNote ?? '—') : i.reportedPaidAt ? <span><Badge tone="warning">Já pagou</Badge> <span className="text-muted">{formatDay(dayOf(i.reportedPaidAt))}{i.reportedNote ? ` · ${i.reportedNote}` : ''}</span></span> : <span className="text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">{tab !== 'paid' && <Button size="sm" onClick={() => setConfirming(i)}>Confirmar Pix</Button>}</td>
                </tr>
              ))}
            </Table>
            <Pagination page={res.data.page} totalPages={res.data.totalPages} total={res.data.total} onChange={setPage} />
          </>
        )}
      </Card>
      <ConfirmPaymentModal invoice={confirming} clinicName={confirming?.clinicName} onClose={() => setConfirming(null)} onDone={done} />
    </>
  );
}
