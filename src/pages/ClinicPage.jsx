import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Platform } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import ConfirmPaymentModal from '../components/ConfirmPaymentModal.jsx';
import { Alert, Badge, Button, Card, CardHeader, ErrorState, Field, Input, Loading, Modal, PageHeader, StatusBadge, Table } from '../components/ui.jsx';
import { useUI } from '../context/UIContext.jsx';
import useResource from '../hooks/useResource.js';
import { BILLING_STATE, CLINIC_STATUS, EVENT_LABEL, TEMPLATE_LABEL, actorLabel, pluralDays, remaining } from '../lib/billing.js';
import { dayOf, formatDateTime, formatDay } from '../lib/dates.js';
import { formatMoney } from '../lib/money.js';

function ExtendTrialModal({ clinicId, onClose, onDone }) {
  const [days, setDays] = useState('7');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await Platform.extendTrial(clinicId, Number(days)); await onDone(`Teste estendido em ${pluralDays(Number(days))}.`); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Estender o teste">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-muted">Soma dias ao fim do teste (ou a partir de hoje, se já acabou). Também reativa uma clínica suspensa que ainda não pagou.</p>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Quantos dias?">{({ id }) => <Input id={id} type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} />}</Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Voltar</Button><Button type="submit" loading={busy} disabled={!(Number(days) >= 1)}>Estender</Button></div>
      </form>
    </Modal>
  );
}

function CourtesyModal({ clinicId, onClose, onDone }) {
  const [mode, setMode] = useState('indefinite');
  const [until, setUntil] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await Platform.setCourtesy(clinicId, { indefinite: mode === 'indefinite', until: mode === 'until' ? until : null });
      await onDone('Cortesia atualizada.');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const OPTIONS = [['indefinite', 'Grátis, sem prazo'], ['until', 'Grátis até uma data'], ['none', 'Remover a cortesia']];
  return (
    <Modal open onClose={onClose} title="Cortesia (uso grátis)">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Tipo de cortesia</legend>
          {OPTIONS.map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="courtesy" className="accent-[var(--primary)]" checked={mode === value} onChange={() => setMode(value)} />{label}</label>
          ))}
        </fieldset>
        {mode === 'until' && <Field label="Até quando?">{({ id }) => <Input id={id} type="date" value={until} onChange={(e) => setUntil(e.target.value)} />}</Field>}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Voltar</Button><Button type="submit" loading={busy} disabled={mode === 'until' && !until}>Salvar</Button></div>
      </form>
    </Modal>
  );
}

const USAGE = [['dentists', 'Dentistas'], ['patients', 'Pacientes'], ['secretaries', 'Secretárias'], ['admins', 'Administradores'], ['appointments', 'Agendamentos'], ['appointmentsLast30Days', 'Agendados (30 dias)']];

function Detail({ label, children }) {
  return <div><dt className="text-sm text-muted">{label}</dt><dd className="font-medium">{children}</dd></div>;
}

export default function ClinicPage() {
  const { id } = useParams();
  const ui = useUI();
  const clinic = useResource(() => Platform.clinic(id), [id]);
  const billing = useResource(() => Platform.billing(id), [id]);
  const [dialog, setDialog] = useState(null); // 'trial' | 'courtesy' | 'pay'

  if ((clinic.loading && !clinic.data) || (billing.loading && !billing.data)) return <Loading />;
  const failure = clinic.error ?? billing.error;
  if (failure && (!clinic.data || !billing.data)) return <ErrorState error={failure} onRetry={() => { clinic.reload(); billing.reload(); }} />;

  const c = clinic.data;
  const b = billing.data;
  const refresh = () => Promise.all([clinic.reload(), billing.reload()]);
  const finish = async (message) => { setDialog(null); await refresh(); ui.success(message); };

  const toggleBlock = async () => {
    const block = c.status === 'active';
    const ok = await ui.confirm({
      title: block ? 'Bloquear a clínica?' : 'Reativar a clínica?',
      message: block ? 'Ninguém da clínica consegue usar o sistema até você reativar (independente do pagamento).' : 'A clínica volta a usar o sistema (se o pagamento estiver em dia).',
      confirmLabel: block ? 'Bloquear' : 'Reativar', danger: block,
    });
    if (!ok) return;
    try { await Platform.updateClinic(id, { status: block ? 'suspended' : 'active' }); await refresh(); ui.success(block ? 'Clínica bloqueada.' : 'Clínica reativada.'); } catch (err) { ui.error(err); }
  };

  return (
    <>
      <p className="mb-2 text-sm"><Link to="/clinicas" className="text-primary hover:underline">← Clínicas</Link></p>
      <PageHeader title={c.name}
        subtitle={<span className="flex flex-wrap items-center gap-2"><StatusBadge map={CLINIC_STATUS} value={c.status} /><StatusBadge map={BILLING_STATE} value={b.state} /><span>{remaining(b)}</span></span>}
        actions={<><Button variant="secondary" onClick={() => setDialog('trial')}>Estender teste</Button><Button variant="secondary" onClick={() => setDialog('courtesy')}>Cortesia</Button><Button variant={c.status === 'active' ? 'danger' : 'primary'} onClick={toggleBlock}>{c.status === 'active' ? 'Bloquear' : 'Reativar'}</Button></>} />

      {b.deletionRequestedAt && (
        <Alert tone="danger" className="mb-4">Esta clínica pediu a exclusão dos dados em {formatDay(dayOf(b.deletionRequestedAt))} (LGPD). Antes de apagar, confira o que a lei obriga a guardar (prontuário, registros de cobrança e aceite dos termos). A exclusão é feita por você, no banco de dados.</Alert>
      )}

      <Card className="mb-6">
        <CardHeader title="Uso da clínica" subtitle="Cadastros ativos e agendamentos não cancelados (só quantidades)" />
        <dl className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
          {USAGE.map(([key, label]) => (
            <div key={key} className="flex flex-col justify-between gap-1"><dt className="text-sm text-muted">{label}</dt><dd className="text-2xl font-bold">{c.usage?.[key] ?? '—'}</dd></div>
          ))}
        </dl>
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Assinatura" />
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <Detail label="Plano">{b.plan ? `${b.plan.name} (${formatMoney(b.plan.priceCents)}/mês)` : 'Ainda não escolheu'}</Detail>
            <Detail label="Teste até">{formatDay(b.trialEndsOn)}</Detail>
            <Detail label="Pago até">{b.paidUntil ? formatDay(b.paidUntil) : '—'}</Detail>
            <Detail label="Cortesia">{b.courtesyIndefinite ? 'Sem prazo' : b.courtesyUntil ? `Até ${formatDay(b.courtesyUntil)}` : '—'}</Detail>
            <Detail label="Carência até">{b.graceEndsOn ? formatDay(b.graceEndsOn) : '—'}</Detail>
            <Detail label="Modelo no cadastro">{TEMPLATE_LABEL[c.subscription.templateCode] ?? 'Criada pela plataforma'}</Detail>
          </dl>
        </Card>
        <Card>
          <CardHeader title="Fatura em aberto" />
          {b.invoice ? (
            <div className="flex flex-col gap-3 p-5">
              <p className="text-2xl font-bold">{formatMoney(b.invoice.amountCents)}</p>
              <p className="text-sm text-muted">Período {formatDay(b.invoice.periodStart)} a {formatDay(b.invoice.periodEnd)} · vence em {formatDay(b.invoice.dueOn)}</p>
              {b.invoice.reportedPaidAt ? <Alert tone="warning">A clínica avisou o pagamento em {formatDateTime(b.invoice.reportedPaidAt)}{b.invoice.reportedNote ? `: “${b.invoice.reportedNote}”` : ''}. Confira o Pix na sua conta.</Alert> : <p className="text-sm text-muted">A clínica ainda não avisou que pagou.</p>}
              <div><Button onClick={() => setDialog('pay')}>Confirmar Pix</Button></div>
            </div>
          ) : <p className="p-5 text-sm text-muted">{b.plan ? 'Nenhuma fatura em aberto. A próxima nasce perto do fim do período pago.' : 'A clínica ainda não escolheu um plano.'}</p>}
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader title="Pagamentos confirmados" />
        {b.invoices.length === 0 ? <p className="p-5 text-sm text-muted">Nenhum pagamento confirmado ainda.</p> : (
          <Table head={['Período', 'Valor', 'Pago em', 'Observação']}>
            {b.invoices.map((i) => (
              <tr key={i.id}><td className="px-4 py-3">{formatDay(i.periodStart)} a {formatDay(i.periodEnd)}</td><td className="px-4 py-3">{formatMoney(i.amountCents)}</td><td className="px-4 py-3">{formatDay(dayOf(i.paidAt))}</td><td className="px-4 py-3">{i.paymentNote ?? '—'}</td></tr>
            ))}
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Histórico" subtitle="Últimos eventos de cobrança" />
        <Table head={['Quando', 'O quê', 'Quem']}>
          {b.events.map((e) => (
            <tr key={`${e.type}-${e.createdAt}`}><td className="px-4 py-3">{formatDateTime(e.createdAt)}</td><td className="px-4 py-3">{EVENT_LABEL[e.type] ?? e.type}</td><td className="px-4 py-3"><Badge>{actorLabel(e.actor)}</Badge></td></tr>
          ))}
        </Table>
      </Card>

      {dialog === 'trial' && <ExtendTrialModal clinicId={id} onClose={() => setDialog(null)} onDone={finish} />}
      {dialog === 'courtesy' && <CourtesyModal clinicId={id} onClose={() => setDialog(null)} onDone={finish} />}
      {dialog === 'pay' && <ConfirmPaymentModal invoice={b.invoice} clinicName={c.name} onClose={() => setDialog(null)} onDone={() => finish('Pagamento confirmado. O acesso da clínica foi liberado.')} />}
    </>
  );
}
