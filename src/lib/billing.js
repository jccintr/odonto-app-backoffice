// Rótulos e regras de apresentação do backoffice.
export const BILLING_STATE = {
  trial: { label: 'Em teste', tone: 'info' },
  active: { label: 'Em dia', tone: 'success' },
  courtesy: { label: 'Cortesia', tone: 'primary' },
  past_due: { label: 'Em atraso', tone: 'warning' },
  suspended: { label: 'Suspensa', tone: 'danger' },
  canceled: { label: 'Cancelada', tone: 'danger' },
};

export const CLINIC_STATUS = { active: { label: 'Ativa', tone: 'success' }, suspended: { label: 'Bloqueada', tone: 'danger' } };

export const TEMPLATE_LABEL = { general: 'Clínica geral', orthodontics: 'Ortodontia', empty: 'Vazia' };

export const pluralDays = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

/** "faltam 5 dias" / "venceu há 3 dias" / "sem prazo" */
export function remaining(subscription) {
  const { daysLeft } = subscription;
  if (daysLeft === null) return 'sem prazo';
  if (daysLeft === 0) return 'vence hoje';
  return daysLeft > 0 ? `faltam ${pluralDays(daysLeft)}` : `venceu há ${pluralDays(-daysLeft)}`;
}

/** Atenção que a clínica pede ao dono: pagamento avisado, exclusão pedida ou suspensão. null = nada. */
export function attentionFor(clinic) {
  const { state, deletionRequestedAt } = clinic.subscription;
  if (deletionRequestedAt) return { tone: 'danger', label: 'Pediu exclusão (LGPD)' };
  if (state === 'suspended' || state === 'canceled') return { tone: 'danger', label: 'Acesso suspenso por falta de pagamento' };
  if (state === 'past_due') return { tone: 'warning', label: 'Pagamento em atraso' };
  if (clinic.status === 'suspended') return { tone: 'warning', label: 'Bloqueada manualmente' };
  return null;
}

/** Preço em centavos a partir do que foi digitado ("149", "149,90", "1.249,90"). null = inválido. */
export function parsePriceCents(text) {
  const cleaned = String(text).trim().replace(/^R\$\s*/, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ''] = cleaned.replace(/\./g, '').split(',');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export const EVENT_LABEL = {
  clinic_created: 'Clínica criada',
  plan_chosen: 'Plano escolhido',
  payment_reported: 'Clínica avisou o pagamento',
  invoice_paid: 'Pagamento confirmado',
  trial_extended: 'Teste estendido',
  courtesy_set: 'Cortesia alterada',
  deletion_requested: 'Pediu exclusão dos dados',
  deletion_canceled: 'Cancelou o pedido de exclusão',
};

/** Quem fez: a clínica, um administrador da plataforma ou o sistema. */
export function actorLabel(actor) {
  if (!actor || actor === 'system') return 'Sistema';
  return actor.startsWith('platform:') ? 'Você (plataforma)' : 'Clínica';
}
