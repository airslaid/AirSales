# Roadmap de Melhorias - Air Sales CRM

Este documento lista as melhorias sugeridas para o sistema, priorizadas por impacto e viabilidade.

## 1. Arquitetura & Manutenibilidade (Crítico)
O arquivo principal `CRMView.tsx` cresceu muito e precisa ser refatorado para garantir a estabilidade futura.

- [ ] **Dividir `CRMView.tsx`**: Extrair componentes menores (`PipelineBoard`, `DashboardMetrics`, `TaskBoard`, `AgendaView`).
- [ ] **React Query**: Substituir chamadas manuais de API (`useEffect` + `fetch`) por `TanStack Query` para melhor cache e estados de carregamento.
- [ ] **Tipagem Estrita**: Remover usos de `any` para evitar erros silenciosos.

## 2. Experiência do Usuário (UX)
Melhorias visuais e de usabilidade para tornar o sistema mais agradável.

- [x] **Notificações Modernas**: Substituir `alert()` por "Toasts" (`sonner`). (Implementado)
- [ ] **Modo Escuro (Dark Mode)**: Adicionar toggle para tema escuro.
- [ ] **Responsividade Mobile**: Melhorar a visualização do Kanban em telas pequenas.
- [ ] **Skeletons de Carregamento**: Substituir spinners por skeletons (placeholders animados) para sensação de velocidade.

## 3. Funcionalidades de Negócio
Novas ferramentas para ajudar a vender mais.

- [ ] **Gestão Visual de Metas**: Gráfico de velocímetro "Realizado vs Meta" no Cockpit.
- [ ] **Timeline do Cliente**: Visão unificada de Pedidos + Tarefas + Reuniões + Mudanças de Status.
- [ ] **Automação de WhatsApp**: Botão "Enviar WhatsApp" com mensagem pré-definida baseada no status do pedido.
- [ ] **Lead Scoring**: Usar IA para pontuar leads com base no histórico de compras e interações.

## 4. Inteligência Artificial Avançada
- [ ] **Chat com Dados**: Interface de chat para perguntar "Qual representante vendeu mais mês passado?" (Text-to-SQL).
- [ ] **Análise de Sentimento**: Analisar notas de reuniões para detectar risco de churn.

---
**Próximos Passos Sugeridos:**
Recomendo iniciar pela **Refatoração do CRMView** ou pela **Timeline do Cliente**.
