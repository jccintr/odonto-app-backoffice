import { useState } from 'react';
import { Platform } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import { Alert, Badge, Button, Card, ErrorState, Field, Input, Loading, Modal, PageHeader, Table, Checkbox } from '../components/ui.jsx';
import { useUI } from '../context/UIContext.jsx';
import useResource from '../hooks/useResource.js';
import { parsePriceCents } from '../lib/billing.js';
import { formatMoney, centsToInput } from '../lib/money.js';

function EditPlanModal({ plan, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: plan.name, description: plan.description ?? '', price: centsToInput(plan.priceCents), maxDentists: plan.maxDentists === null ? '' : String(plan.maxDentists), active: plan.active,
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const cents = parsePriceCents(form.price);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await Platform.updatePlan(plan.id, {
        name: form.name.trim(), description: form.description.trim() || null, priceCents: cents,
        maxDentists: form.maxDentists.trim() === '' ? null : Number(form.maxDentists), active: form.active,
      });
      await onSaved();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Editar plano ${plan.name}`}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-muted">O novo preço vale nas faturas criadas daqui em diante; as já emitidas mantêm o valor.</p>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Nome">{({ id }) => <Input id={id} value={form.name} onChange={set('name')} />}</Field>
        <Field label="Descrição">{({ id }) => <Input id={id} value={form.description} onChange={set('description')} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço mensal (R$)" error={form.price && cents === null ? 'Valor inválido.' : null}>{({ id, invalid }) => <Input id={id} invalid={invalid} inputMode="decimal" value={form.price} onChange={set('price')} />}</Field>
          <Field label="Máximo de dentistas" hint="Vazio = ilimitado.">{({ id }) => <Input id={id} type="number" min="1" value={form.maxDentists} onChange={set('maxDentists')} />}</Field>
        </div>
        <Checkbox label="Disponível para novas escolhas" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" loading={busy} disabled={cents === null || form.name.trim().length < 2}>Salvar</Button></div>
      </form>
    </Modal>
  );
}

export default function PlansPage() {
  const ui = useUI();
  const res = useResource(() => Platform.plans(), []);
  const [editing, setEditing] = useState(null);
  if (res.loading && !res.data) return <Loading />;
  if (res.error && !res.data) return <ErrorState error={res.error} onRetry={res.reload} />;

  return (
    <>
      <PageHeader title="Planos" subtitle="Preços e limites que as clínicas veem na hora de assinar." />
      <Card>
        <Table head={['Plano', 'Preço mensal', 'Dentistas', 'Situação', { label: '', right: true }]}>
          {res.data.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3"><span className="font-medium">{p.name}</span><span className="block text-xs text-muted">{p.description}</span></td>
              <td className="px-4 py-3">{formatMoney(p.priceCents)}</td>
              <td className="px-4 py-3">{p.maxDentists === null ? 'Ilimitados' : `Até ${p.maxDentists}`}</td>
              <td className="px-4 py-3">{p.active ? <Badge tone="success">Disponível</Badge> : <Badge>Desativado</Badge>}</td>
              <td className="px-4 py-3 text-right"><Button size="sm" variant="secondary" onClick={() => setEditing(p)}>Editar</Button></td>
            </tr>
          ))}
        </Table>
      </Card>
      {editing && <EditPlanModal plan={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await res.reload(); ui.success('Plano atualizado.'); }} />}
    </>
  );
}
