import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Platform } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Field, Input, Loading, Modal, PageHeader, Pagination, PasswordInput, Select, StatusBadge, Table } from '../components/ui.jsx';
import { useUI } from '../context/UIContext.jsx';
import useDebounced from '../hooks/useDebounced.js';
import useResource from '../hooks/useResource.js';
import { BILLING_STATE, TEMPLATE_LABEL, attentionFor, remaining } from '../lib/billing.js';
import { dayOf, formatDay } from '../lib/dates.js';

function NewClinicModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', adminName: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const created = await Platform.createClinic({ name: form.name.trim(), admin: { name: form.adminName.trim(), email: form.email.trim(), password: form.password } });
      onCreated(created.clinic);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Nova clínica">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-muted">Cria a clínica em teste grátis e o primeiro administrador, que recebe o e-mail de confirmação. (Clínicas também se cadastram sozinhas pelo site.)</p>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Nome da clínica" required>{({ id }) => <Input id={id} value={form.name} onChange={set('name')} />}</Field>
        <Field label="Nome do administrador" required>{({ id }) => <Input id={id} value={form.adminName} onChange={set('adminName')} />}</Field>
        <Field label="E-mail do administrador" required>{({ id }) => <Input id={id} type="email" value={form.email} onChange={set('email')} />}</Field>
        <Field label="Senha inicial" required hint="No mínimo 8 caracteres.">{({ id }) => <PasswordInput id={id} autoComplete="new-password" value={form.password} onChange={set('password')} />}</Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={busy} disabled={form.name.trim().length < 2 || form.adminName.trim().length < 2 || !form.email || form.password.length < 8}>Criar clínica</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ClinicsPage() {
  const ui = useUI();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const q = useDebounced(search.trim());
  const billing = params.get('situacao') ?? '';
  const res = useResource(() => Platform.clinics({ q, billing, page, perPage: 20 }), [q, billing, page]);

  const setBilling = (value) => { setPage(1); setParams(value ? { situacao: value } : {}); };

  return (
    <>
      <PageHeader title="Clínicas" actions={<Button icon="plus" onClick={() => setCreating(true)}>Nova clínica</Button>} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-border p-4">
          <Input aria-label="Buscar clínica" placeholder="Buscar por nome…" className="max-w-xs" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Select aria-label="Situação da assinatura" className="max-w-[14rem]" value={billing} onChange={(e) => setBilling(e.target.value)}>
            <option value="">Todas as situações</option>
            {Object.entries(BILLING_STATE).map(([value, info]) => <option key={value} value={value}>{info.label}</option>)}
          </Select>
        </div>
        {res.loading && !res.data ? <Loading /> : res.error ? <div className="p-4"><ErrorState error={res.error} onRetry={res.reload} /></div> : res.data.data.length === 0 ? (
          <EmptyState icon="users" title="Nenhuma clínica encontrada" />
        ) : (
          <>
            <Table head={['Clínica', 'Assinatura', 'Plano', 'Modelo', 'Criada em', 'Atenção']}>
              {res.data.data.map((c) => {
                const attention = attentionFor(c);
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium"><Link to={`/clinicas/${c.id}`} className="text-primary hover:underline">{c.name}</Link></td>
                    <td className="px-4 py-3"><StatusBadge map={BILLING_STATE} value={c.subscription.state} /> <span className="text-xs text-muted">{remaining(c.subscription)}</span></td>
                    <td className="px-4 py-3">{c.subscription.planName ?? <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-3">{TEMPLATE_LABEL[c.subscription.templateCode] ?? <span className="text-muted">—</span>}</td>
                    <td className="px-4 py-3">{formatDay(dayOf(c.createdAt))}</td>
                    <td className="px-4 py-3">{c.status === 'suspended' && <Badge tone="danger" className="mr-1">Bloqueada</Badge>}{attention ? <Badge tone={attention.tone}>{attention.label}</Badge> : <span className="text-muted">—</span>}</td>
                  </tr>
                );
              })}
            </Table>
            <Pagination page={res.data.page} totalPages={res.data.totalPages} total={res.data.total} onChange={setPage} />
          </>
        )}
      </Card>
      {creating && <NewClinicModal onClose={() => setCreating(false)} onCreated={(clinic) => { setCreating(false); res.reload(); ui.success(`Clínica ${clinic.name} criada.`); }} />}
    </>
  );
}
