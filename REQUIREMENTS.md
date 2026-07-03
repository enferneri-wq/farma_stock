# Documento de Requisitos: PharmaStock SaaS

## 1. Visão Geral
O PharmaStock é uma solução SaaS (Software as a Service) projetada para farmácias, hospitais e clínicas. O foco é o controle rigoroso de medicamentos e materiais, rastreabilidade de doações e gestão logística de insumos em ambulâncias.

## 2. Arquitetura Proposta
*   **Modelo:** SaaS Multi-tenant (Isolamento de dados por `tenant_id`).
*   **Arquitetura de Software:** Monolito Modular (Modular Monolith) para facilitar o deploy inicial na Hostinger, mantendo a separação de domínios para futura migração para microserviços se necessário.
*   **Stack Tecnológica:**
    *   **Frontend:** React.js com TypeScript, Tailwind CSS e Lucide React.
    *   **Backend:** Node.js com Express e TypeScript.
    *   **Banco de Dados:** PostgreSQL (Relacional, ideal para integridade de estoque e transações financeiras).
    *   **Cache/Filas:** Redis (para alertas e processamento de webhooks do PagSeguro).

## 3. Requisitos Funcionais (RF)

### RF01: Controle de Estoque
*   **Gerenciamento:** CRUD completo de medicamentos (Princípio ativo, nome comercial, fabricante, forma farmacêutica).
*   **Lote e Validade:** Cada entrada de estoque deve obrigatoriamente registrar o número do lote e a data de validade.
*   **Estoque Mínimo:** Definição de gatilhos de quantidade mínima por item.
*   **Alertas Inteligentes:**
    *   Painel de "Atenção" para itens vencendo em 30, 60 ou 90 dias (configurável).
    *   Notificações visuais para itens abaixo do estoque mínimo.

### RF02: Gestão de Doações
*   **Fluxo de Entrada:** Cadastro de medicamentos recebidos via doação, com campo para origem (doador) e termo de responsabilidade.
*   **Rastreabilidade:** Marcação específica no banco de dados para diferenciar itens comprados de itens doados, impedindo a venda de itens doados (se aplicável à legislação).

### RF03: Logística de Ambulâncias
*   **Sub-estoques:** Cada ambulância é tratada como um "estoque móvel" vinculado ao estoque central.
*   **Transferência:** Funcionalidade de "Checkout de Insumos" para abastecimento da ambulância e "Check-in" para devolução de sobras.
*   **Consumo:** Registro de itens utilizados em ocorrências para baixa automática no estoque da unidade móvel.

### RF04: Pedidos e Devoluções
*   **Pedidos Internos:** Requisições de setores para a farmácia central.
*   **Pedidos Externos:** Geração de lista de compras para fornecedores baseada no estoque mínimo.
*   **Devoluções:** Registro de retorno de materiais não utilizados, com inspeção de integridade e validade.

### RF05: Relatórios e BI
*   **Inventário:** Valor total em estoque, curva ABC de consumo.
*   **Movimentação:** Histórico completo de entradas e saídas por usuário e data.
*   **Perdas:** Relatório de itens vencidos ou danificados.

## 4. Integração PagSeguro (SaaS Billing)
O sistema utilizará o modelo de assinatura recorrente.

*   **Fluxo de Assinatura:**
    1.  Usuário escolhe o plano (Basic, Pro, Hospitalar).
    2.  Redirecionamento para o Checkout Transparente ou via Link de Pagamento.
    3.  Processamento de Cartão de Crédito ou Boleto/PIX.
*   **Gestão de Recorrência:**
    *   Uso de Webhooks para ouvir eventos de `PAID`, `REFUNDED` e `CANCELED`.
    *   **Bloqueio Automático:** Caso o pagamento falhe após 3 tentativas, o acesso ao tenant é restrito ao modo "Apenas Leitura".
*   **Segurança Financeira:** Armazenamento apenas do `token` do cartão (via PagSeguro), nunca os dados sensíveis no nosso banco.

## 5. Requisitos Não Funcionais (RNF)
*   **RNF01 - Segurança (LGPD):** Criptografia em repouso (AES-256) e em trânsito (TLS 1.3). Logs de auditoria para cada acesso a dados de pacientes (se houver).
*   **RNF02 - Multi-tenancy:** Filtro global em todas as queries SQL para garantir que um usuário da "Farmácia A" nunca veja dados da "Farmácia B".
*   **RNF03 - Performance:** Geração de relatórios pesados em background (jobs) para não travar a UI.
*   **RNF04 - Disponibilidade:** Deploy em containers com auto-healing.

## 6. Estrutura de Banco de Dados (Simplificada)
*   `tenants`: id, name, document, plan_status.
*   `users`: id, tenant_id, name, email, password_hash, role (admin, farmaceutico, logistica).
*   `products`: id, tenant_id, name, description, min_stock.
*   `stock_items`: id, product_id, batch_number, expiry_date, quantity, is_donation.
*   `ambulances`: id, tenant_id, plate, description.
*   `transactions`: id, tenant_id, type (entry, exit, transfer, return), user_id.

## 7. Critérios de Aceitação
*   O sistema deve impedir a saída de um medicamento se a quantidade solicitada for maior que o saldo do lote específico.
*   O alerta de validade deve ser disparado via e-mail/notificação push conforme configuração do gestor.
*   A integração com PagSeguro deve validar o status do pagamento antes de liberar o primeiro acesso ao dashboard.
