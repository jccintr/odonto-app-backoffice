import { describe, expect, it } from 'vitest';
import { clinicReportsPayment, demo, loginPlatform, renderApp, screen, user, waitFor, within } from './helpers.jsx';

describe('entrada', () => {
  it('quem não entrou é levado ao login; senha errada mostra o erro; senha certa abre a visão geral e dá para sair', async () => {
    const u = user();
    renderApp('/clinicas');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();

    await u.type(screen.getByLabelText('E-mail'), demo().platform.email);
    await u.type(screen.getByLabelText('Senha'), 'senha-errada-123');
    await u.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/inválid/i);

    await u.clear(screen.getByLabelText('Senha'));
    await u.type(screen.getByLabelText('Senha'), demo().platform.password);
    await u.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: 'Clínicas' })).toBeInTheDocument(); // volta para onde queria ir
    expect(screen.getAllByText(demo().platform.name).length).toBeGreaterThan(0);

    await u.click(screen.getAllByRole('button', { name: /Sair/ })[0]);
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('o token da clínica não entra no backoffice', async () => {
    const u = user();
    renderApp('/login');
    await u.type(await screen.findByLabelText('E-mail'), demo().admin.email); // administrador de CLÍNICA
    await u.type(screen.getByLabelText('Senha'), demo().admin.password);
    await u.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/inválid/i);
  });
});

describe('visão geral', () => {
  it('mostra os números da plataforma e leva às clínicas de cada situação', async () => {
    const u = user();
    await loginPlatform();
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeInTheDocument();
    expect(screen.getByText('Receita mensal recorrente')).toBeInTheDocument();
    expect(screen.getByText('Pedidos de exclusão (LGPD)')).toBeInTheDocument();
    await u.click(screen.getByRole('link', { name: /Em teste/ }));
    expect(await screen.findByRole('heading', { name: 'Clínicas' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Clínica Sorriso' })).toBeInTheDocument();
    expect(screen.getByLabelText('Situação da assinatura')).toHaveValue('trial');
  });
});

describe('clínicas', () => {
  it('lista, busca, filtra por situação, cria uma clínica nova e abre o detalhe', async () => {
    const u = user();
    await loginPlatform();
    renderApp('/clinicas');
    expect(await screen.findByRole('link', { name: 'Clínica Sorriso' })).toBeInTheDocument();
    const row = screen.getByRole('link', { name: 'Clínica Sorriso' }).closest('tr');
    expect(within(row).getByText('Em teste')).toBeInTheDocument();

    await u.selectOptions(screen.getByLabelText('Situação da assinatura'), 'suspended');
    expect(await screen.findByText('Nenhuma clínica encontrada')).toBeInTheDocument();
    await u.selectOptions(screen.getByLabelText('Situação da assinatura'), '');
    expect(await screen.findByRole('link', { name: 'Clínica Sorriso' })).toBeInTheDocument();

    await u.type(screen.getByLabelText('Buscar clínica'), 'zzz-nao-existe');
    expect(await screen.findByText('Nenhuma clínica encontrada')).toBeInTheDocument();
    await u.clear(screen.getByLabelText('Buscar clínica'));

    await u.click(screen.getByRole('button', { name: /Nova clínica/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Nova clínica' });
    const create = within(dialog).getByRole('button', { name: 'Criar clínica' });
    expect(create).toBeDisabled();
    await u.type(within(dialog).getByLabelText(/Nome da clínica/), 'Clínica do Backoffice');
    await u.type(within(dialog).getByLabelText(/Nome do administrador/), 'Dr. Back');
    await u.type(within(dialog).getByLabelText(/E-mail do administrador/), 'email-invalido'); // a API recusa: erro no formulário
    await u.type(within(dialog).getByLabelText(/Senha inicial/), 'senha-do-back-123');
    await u.click(create);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/inválid/i);

    await u.clear(within(dialog).getByLabelText(/E-mail do administrador/));
    await u.type(within(dialog).getByLabelText(/E-mail do administrador/), 'back@clinica-backoffice.test');
    await u.click(create);
    expect(await screen.findByRole('link', { name: 'Clínica do Backoffice' })).toBeInTheDocument();

    await u.click(screen.getByRole('link', { name: 'Clínica do Backoffice' }));
    expect(await screen.findByRole('heading', { name: 'Clínica do Backoffice' })).toBeInTheDocument();
    expect(screen.getByText('Ainda não escolheu')).toBeInTheDocument();
    expect(screen.getByText(/A clínica ainda não escolheu um plano/)).toBeInTheDocument();
  });

  it('administrador com e-mail que já tem conta (de outra clínica) recebe um convite', async () => {
    const u = user();
    await loginPlatform();
    renderApp('/clinicas');
    await u.click(await screen.findByRole('button', { name: /Nova clínica/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Nova clínica' });
    await u.type(within(dialog).getByLabelText(/Nome da clínica/), 'Clínica Segunda Unidade');
    await u.type(within(dialog).getByLabelText(/Nome do administrador/), 'Qualquer Nome');
    await u.type(within(dialog).getByLabelText(/E-mail do administrador/), demo().admin.email);
    await u.type(within(dialog).getByLabelText(/Senha inicial/), 'senha-ignorada-123');
    await u.click(within(dialog).getByRole('button', { name: 'Criar clínica' }));
    expect(await screen.findByText(/já tinha conta: enviamos um convite/)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Clínica Segunda Unidade' })).toBeInTheDocument();
  });

  it('estende o teste, dá e tira cortesia, bloqueia e reativa', async () => {
    const u = user();
    await loginPlatform();
    renderApp('/clinicas');
    await u.click(await screen.findByRole('link', { name: 'Clínica do Backoffice' }));
    await screen.findByRole('heading', { name: 'Clínica do Backoffice' });
    expect(screen.getByText('faltam 14 dias')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Estender teste' }));
    let dialog = await screen.findByRole('dialog', { name: 'Estender o teste' });
    await u.clear(within(dialog).getByLabelText('Quantos dias?'));
    await u.type(within(dialog).getByLabelText('Quantos dias?'), '10');
    await u.click(within(dialog).getByRole('button', { name: 'Estender' }));
    expect(await screen.findByText('faltam 24 dias')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Cortesia' }));
    dialog = await screen.findByRole('dialog', { name: /Cortesia/ });
    await u.click(within(dialog).getByRole('button', { name: 'Salvar' })); // padrão: grátis, sem prazo
    expect(await screen.findByText('sem prazo')).toBeInTheDocument();
    expect(screen.getAllByText('Sem prazo').length).toBeGreaterThan(0);

    await u.click(screen.getByRole('button', { name: 'Cortesia' }));
    dialog = await screen.findByRole('dialog', { name: /Cortesia/ });
    await u.click(within(dialog).getByRole('radio', { name: 'Remover a cortesia' }));
    await u.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('faltam 24 dias')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Bloquear' }));
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Bloquear' }));
    expect(await screen.findByRole('button', { name: 'Reativar' })).toBeInTheDocument();
    expect(screen.getAllByText('Bloqueada').length).toBeGreaterThan(0);

    await u.click(screen.getByRole('button', { name: 'Reativar' }));
    await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Reativar' }));
    expect(await screen.findByRole('button', { name: 'Bloquear' })).toBeInTheDocument();
    // o histórico registra o que foi feito
    expect(screen.getByText('Teste estendido')).toBeInTheDocument();
    expect(screen.getAllByText('Cortesia alterada').length).toBe(2);
  });
});

describe('pagamentos', () => {
  it('a clínica avisa o pagamento, o dono confere e confirma, e o acesso fica em dia', async () => {
    const u = user();
    const clinic = await clinicReportsPayment('Pix das 10h');
    await loginPlatform();
    renderApp('/');
    expect(await screen.findByText(/1 pagamento aguarda a sua conferência/)).toBeInTheDocument();
    await u.click(screen.getByRole('link', { name: /Conferir agora/ }));

    expect(await screen.findByRole('heading', { name: 'Pagamentos' })).toBeInTheDocument();
    const row = (await screen.findByRole('link', { name: 'Clínica Sorriso' })).closest('tr');
    expect(within(row).getByText('Já pagou')).toBeInTheDocument();
    expect(within(row).getByText(/Pix das 10h/)).toBeInTheDocument();
    expect(within(row).getByText(/R\$\s*149,00/)).toBeInTheDocument();

    await u.click(within(row).getByRole('button', { name: 'Confirmar Pix' }));
    const dialog = await screen.findByRole('dialog', { name: 'Confirmar pagamento' });
    expect(within(dialog).getByText(/Pix das 10h/)).toBeInTheDocument();
    await u.type(within(dialog).getByLabelText(/Observação/), 'Banco X, 10h12');
    await u.click(within(dialog).getByRole('button', { name: 'Confirmar pagamento' }));
    expect(await screen.findByText('Nenhum pagamento esperando conferência.')).toBeInTheDocument();

    // fica no histórico de pagas, com a observação
    await u.click(screen.getByRole('tab', { name: 'Pagas' }));
    const paid = (await screen.findByRole('link', { name: 'Clínica Sorriso' })).closest('tr');
    expect(within(paid).getByText('Banco X, 10h12')).toBeInTheDocument();
    await u.click(screen.getByRole('tab', { name: 'Em aberto' }));
    expect(await screen.findByText('Nenhuma fatura em aberto.')).toBeInTheDocument();

    // do lado da clínica: assinatura em dia
    expect((await clinic.status()).state).toBe('active');
  });

  it('o detalhe da clínica mostra a assinatura paga e o histórico', async () => {
    const u = user();
    await loginPlatform();
    renderApp('/clinicas');
    await u.click(await screen.findByRole('link', { name: 'Clínica Sorriso' }));
    expect(await screen.findByRole('heading', { name: 'Clínica Sorriso' })).toBeInTheDocument();
    expect(screen.getByText('Clínica (R$ 149,00/mês)')).toBeInTheDocument();
    expect(await screen.findByText('Pagamento confirmado')).toBeInTheDocument();
    expect(screen.getByText('Banco X, 10h12')).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma fatura em aberto/)).toBeInTheDocument();
  });

  it('uma clínica sem pagamento aguardando: aviso vazio nas três abas', async () => {
    const u = user();
    await loginPlatform();
    renderApp('/pagamentos');
    expect(await screen.findByText('Nenhum pagamento esperando conferência.')).toBeInTheDocument();
    await u.click(screen.getByRole('tab', { name: 'Em aberto' }));
    expect(await screen.findByText('Nenhuma fatura em aberto.')).toBeInTheDocument();
  });
});

describe('planos', () => {
  it('edita o preço, valida o valor e mostra o resultado', async () => {
    const u = user();
    await loginPlatform();
    renderApp('/planos');
    expect(await screen.findByRole('heading', { name: 'Planos' })).toBeInTheDocument();
    const row = screen.getByText('Essencial').closest('tr');
    expect(within(row).getByText(/R\$\s*79,00/)).toBeInTheDocument();
    expect(within(row).getByText('Até 1')).toBeInTheDocument();

    await u.click(within(row).getByRole('button', { name: 'Editar' }));
    const dialog = await screen.findByRole('dialog', { name: /Editar plano Essencial/ });
    const price = within(dialog).getByLabelText(/Preço mensal/);
    await u.clear(price);
    await u.type(price, 'abc');
    expect(within(dialog).getByText('Valor inválido.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeDisabled();
    await u.clear(price);
    await u.type(price, '89,90');
    await u.clear(within(dialog).getByLabelText(/Máximo de dentistas/)); // vazio = ilimitado
    await u.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // a lista recarrega depois de salvar: espera o valor novo aparecer
    const updated = screen.getByText('Essencial').closest('tr');
    expect(await within(updated).findByText(/R\$\s*89,90/)).toBeInTheDocument();
    expect(within(updated).getByText('Ilimitados')).toBeInTheDocument();

    // desativar tira o plano da lista de escolha das clínicas
    await u.click(within(updated).getByRole('button', { name: 'Editar' }));
    const again = await screen.findByRole('dialog', { name: /Editar plano/ });
    await u.click(within(again).getByRole('checkbox'));
    await u.click(within(again).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(within(screen.getByText('Essencial').closest('tr')).getByText('Desativado')).toBeInTheDocument());
  });
});
