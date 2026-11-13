# OdontoApp — Backoffice (dono da plataforma)

App web **só para você**, o dono da plataforma: acompanha as clínicas, confere os Pix e libera o acesso de quem pagou.
Fala com a mesma API, usando o login da plataforma (`/api/platform/login`, segredo de JWT próprio: o login de uma clínica não entra aqui).

## Telas

- **Visão geral:** receita mensal recorrente, clínicas por situação (teste, em dia, cortesia, em atraso, suspensa), cadastros recentes, faturas em aberto, **pagamentos aguardando conferência** e pedidos de exclusão (LGPD).
- **Pagamentos:** fila de faturas com abas *Aguardando conferência* (a clínica clicou em "Já paguei"), *Em aberto* e *Pagas*. **Confirmar Pix** libera mais 1 mês para a clínica.
- **Clínicas:** busca e filtro por situação da assinatura; **nova clínica**; detalhe com assinatura, fatura aberta, pagamentos e histórico de eventos. Ações: **estender teste**, **cortesia** (sem prazo, até uma data ou remover), **bloquear/reativar** e confirmar Pix.
- **Planos:** edita nome, descrição, preço mensal, limite de dentistas e disponibilidade. O novo preço vale nas faturas criadas daí em diante.

> **Pedido de exclusão (LGPD):** a clínica pede pelo app dela e você vê o aviso na visão geral e no detalhe. A exclusão em si é manual, no banco, preservando o que a lei manda guardar (prontuário, registros de cobrança, aceite dos termos).

## Rodando

```bash
# 1) API de demonstração (PostgreSQL embutido) — na pasta api
npm run demo

# 2) Backoffice — nesta pasta
npm install
npm run dev        # http://localhost:5174
```

Login da demonstração: `plataforma@sorriso.test` / `senha-da-plataforma-1`.
Com a API de verdade, crie o seu acesso na pasta `api`: `npm run platform-admin:create -- "Seu Nome" voce@email.com sua-senha`.

Para ver a fila de pagamentos funcionando na demonstração: entre no app web como `admin@sorriso.test`, escolha um plano em Assinatura e clique em **Já paguei**; depois confirme aqui em Pagamentos.

## Testes

```bash
npm test            # unitários (regras, cliente da API, sessão, tema) com cobertura de 100%
npm run test:e2e    # ponta a ponta: o app inteiro (jsdom) contra a API real e um PostgreSQL embutido
```
O e2e sobe `api/src/scripts/demo-server.js` (precisa de `npm install` na pasta `api`); `E2E_API_DIR` muda onde a API está (padrão `../api`).

## Publicação (Vercel)

Projeto separado do app web. Variável `VITE_API_URL` = URL da API. O `vercel.json` já reescreve tudo para `index.html`.
Recomendado: um endereço que só você conhece (ex.: `admin.seudominio.com.br`). O acesso é protegido pelo login da plataforma, mas não há motivo para divulgar.
