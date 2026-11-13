import { useState } from 'react';
import { Platform } from '../api/index.js';
import { errorMessage } from '../api/client.js';
import { formatDay } from '../lib/dates.js';
import { formatMoney } from '../lib/money.js';
import { Alert, Button, Field, Modal, Textarea } from './ui.jsx';

/** Confirma o Pix de uma fatura: libera mais 1 mês para a clínica. Confira o valor na sua conta antes. */
export default function ConfirmPaymentModal({ invoice, clinicName, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!invoice) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await Platform.payInvoice(invoice.clinicId, invoice.id, note.trim()); setNote(''); await onDone(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title="Confirmar pagamento">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <p>Confirme que o Pix de <strong>{formatMoney(invoice.amountCents)}</strong> de <strong>{clinicName}</strong> caiu na sua conta. Isso libera o período de {formatDay(invoice.periodStart)} em diante (1 mês a partir do fim do que já está pago, ou de hoje se já venceu).</p>
        {invoice.reportedNote && <Alert tone="info">Observação da clínica: {invoice.reportedNote}</Alert>}
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Observação (opcional)" hint="Fica no histórico. Ex.: banco, horário, comprovante.">{({ id }) => <Textarea id={id} maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Voltar</Button>
          <Button type="submit" loading={busy}>Confirmar pagamento</Button>
        </div>
      </form>
    </Modal>
  );
}
