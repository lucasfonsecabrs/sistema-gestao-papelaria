-- Schema do Supabase (Postgres) do Sistema de Gestão Malô Personalizados.
-- Segue o schema definitivo do prompt de construção (6 tabelas). Duas colunas
-- a mais, marcadas com [adição], sustentam funções já existentes:
--   * insumos.categoria  -> filtro por categoria no Estoque
--   * excluido_em        -> lixeira: excluir preenche a data, restaurar volta
--                           para null. Nada é apagado de verdade.
--
-- Sem NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (ou se uma consulta falhar) o sistema
-- usa os dados em memória de lib/store.ts.

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contato text not null,
  excluido_em timestamptz -- [adição]
);

create table if not exists insumos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  unidade text not null check (unidade in ('folha', 'cm', 'metro', 'ml', 'unidade', 'kg')),
  quantidade_estoque numeric not null default 0 check (quantidade_estoque >= 0),
  quantidade_minima numeric not null default 0 check (quantidade_minima >= 0),
  custo_unitario numeric not null default 0 check (custo_unitario >= 0),
  categoria text not null default 'Outros', -- [adição]
  excluido_em timestamptz -- [adição]
);

-- Linha única (id = 1), ajustada na tela /configuracoes. Tudo começa em zero.
create table if not exists configuracoes (
  id integer primary key default 1 check (id = 1),
  valor_hora_trabalho numeric not null default 0 check (valor_hora_trabalho >= 0),
  percentual_perdas numeric not null default 0 check (percentual_perdas >= 0),
  percentual_custos_fixos numeric not null default 0 check (percentual_custos_fixos >= 0)
);

insert into configuracoes (id) values (1) on conflict (id) do nothing;

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  margem_desejada numeric not null default 0 check (margem_desejada >= 0),
  tempo_producao_minutos numeric not null default 0 check (tempo_producao_minutos >= 0),
  excluido_em timestamptz -- [adição]
);

create table if not exists produto_insumos (
  produto_id uuid not null references produtos (id) on delete cascade,
  insumo_id uuid not null references insumos (id),
  quantidade_por_unidade numeric not null check (quantidade_por_unidade > 0),
  primary key (produto_id, insumo_id)
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id),
  produto_id uuid not null references produtos (id),
  cores text not null default '',
  texto_personalizacao text not null default '',
  quantidade integer not null check (quantidade > 0),
  data_entrega date not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'em_producao', 'pronto', 'entregue')),
  valor_final numeric not null default 0 check (valor_final >= 0),
  excluido_em timestamptz -- [adição]
);

-- Para bancos criados antes destas colunas:
alter table clientes add column if not exists excluido_em timestamptz;
alter table insumos add column if not exists categoria text not null default 'Outros';
alter table insumos add column if not exists excluido_em timestamptz;
alter table produtos add column if not exists tempo_producao_minutos numeric not null default 0;
alter table produtos add column if not exists excluido_em timestamptz;
alter table pedidos add column if not exists excluido_em timestamptz;
