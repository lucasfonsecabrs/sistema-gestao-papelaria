# Sistema de Gestão para Papelaria Personalizada

Sistema web de gestão desenvolvido para a **Malô Personalizados**, uma MEI de papelaria personalizada de Piquete-SP (caixinhas, toppers e kits para festas infantis).

Projeto Integrador em Computação II — UNIVESP, 2026.
Autor: Lucas Henrique Gonçalves da Fonseca.

**Produção:** https://pi-system-azure.vercel.app

## Módulos

| Módulo | O que faz |
|---|---|
| **Pedidos** | Cadastro de pedidos personalizados (cliente, produto, cores, texto, quantidade, data de entrega). Calcula a urgência de cada pedido (atrasado, urgente, próximo ou tranquilo) e acompanha o status (pendente, em produção, pronto, entregue). |
| **Estoque** | Cadastro de insumos com quantidade atual e mínima. Classifica cada insumo como normal, baixo ou crítico e indica quanto repor. |
| **Precificação** | Calcula o custo de cada produto a partir dos insumos usados e sugere o preço de venda considerando mão de obra, perdas, custos fixos e margem desejada. |
| **Clientes** | Cadastro de clientes com aviso de possíveis duplicados. |

Itens excluídos vão para uma lixeira e podem ser restaurados.

## Tecnologias

- **Next.js 16** (React 19, App Router) e **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (Postgres) como banco de dados
- **API REST** própria em `app/api`
- **Vitest** para testes automatizados
- Hospedagem na **Vercel**

## Estrutura

```
app/
  api/            rotas REST (clientes, insumos, produtos, pedidos, configuracoes)
  components/     componentes da interface (abas, formulários, elementos visuais)
  configuracoes/  tela de configurações de precificação
  page.tsx        tela principal
lib/
  pedidos.ts      regras de urgência e status dos pedidos
  estoque.ts      regras de status e reposição do estoque
  precificacao.ts cálculo de custo e preço sugerido
  validacao.ts    validação dos dados de entrada
  visao.ts        filtros, ordenação e resumos exibidos nas telas
  repositorio.ts  acesso aos dados (Supabase, com dados em memória como reserva)
supabase/
  schema.sql      criação das tabelas
```

## Como rodar localmente

Requisitos: Node.js 20 ou superior.

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev
```

Acesse http://localhost:3000.

Sem as variáveis do Supabase o sistema funciona com dados de exemplo em memória, que se perdem ao reiniciar o servidor.

### Banco de dados

No painel do Supabase, abra o **SQL Editor** e execute o conteúdo de `supabase/schema.sql`. O script pode ser executado mais de uma vez sem apagar dados.

Variáveis de ambiente:

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (somente leitura) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de servidor, necessária para gravar. Nunca deve ser exposta no navegador |

## Testes

```bash
npm test
```

Os testes cobrem as regras de pedidos, estoque, precificação, validação, as telas de resumo e as rotas da API.

## Acessibilidade

Formulários com rótulos associados aos campos, contraste adequado, navegação por teclado e layout adaptado para celular.
