import { type StatusPedido } from "./pedidos";
import { CONFIGURACOES_PADRAO, type Configuracoes } from "./precificacao";

export type Cliente = {
  id: string;
  nome: string;
  contato: string;
};

export type Insumo = {
  id: string;
  nome: string;
  categoria?: string;
  unidade: string;
  quantidade_estoque: number;
  quantidade_minima: number;
  custo_unitario: number;
};

export type ProdutoInsumo = {
  insumo_id: string;
  quantidade_por_unidade: number;
};

export type Produto = {
  id: string;
  nome: string;
  margem_desejada: number;
  tempo_producao_minutos: number;
  insumos: ProdutoInsumo[];
};

export type Pedido = {
  id: string;
  cliente_id: string;
  produto_id: string;
  cores: string;
  texto_personalizacao: string;
  quantidade: number;
  data_entrega: string;
  status: StatusPedido;
  valor_final: number;
};

export const clientes: Cliente[] = [
  { id: "cli-1", nome: "Maria Souza", contato: "(14) 99888-1001" },
  { id: "cli-2", nome: "João Santos", contato: "(14) 99652-7788" },
  { id: "cli-3", nome: "Ana Costa", contato: "(14) 99114-2233" },
];

export const insumos: Insumo[] = [
  {
    id: "ins-1",
    nome: "Papel Premium",
    categoria: "Papéis",
    unidade: "folha",
    quantidade_estoque: 1800,
    quantidade_minima: 600,
    custo_unitario: 0.18,
  },
  {
    id: "ins-2",
    nome: "Fita de Cetim",
    categoria: "Fitas",
    unidade: "cm",
    quantidade_estoque: 12000,
    quantidade_minima: 3000,
    custo_unitario: 0.014,
  },
  {
    id: "ins-3",
    nome: "Tinta Acrílica",
    categoria: "Impressão",
    unidade: "ml",
    quantidade_estoque: 850,
    quantidade_minima: 200,
    custo_unitario: 0.07,
  },
];

insumos.push(
  { id: "ins-4", nome: "Papel Offset 180g A4", categoria: "Papéis", unidade: "folha", quantidade_estoque: 500, quantidade_minima: 100, custo_unitario: 0.35 },
  { id: "ins-5", nome: "Papel Offset 240g A4", categoria: "Papéis", unidade: "folha", quantidade_estoque: 300, quantidade_minima: 80, custo_unitario: 0.48 },
  { id: "ins-6", nome: "Papel Kraft 180g A4", categoria: "Papéis", unidade: "folha", quantidade_estoque: 200, quantidade_minima: 50, custo_unitario: 0.55 },
  { id: "ins-7", nome: "Papel Kraft 240g A4", categoria: "Papéis", unidade: "folha", quantidade_estoque: 150, quantidade_minima: 40, custo_unitario: 0.72 },
  { id: "ins-8", nome: "Papel Fotográfico Glossy 180g A4", categoria: "Papéis", unidade: "folha", quantidade_estoque: 200, quantidade_minima: 50, custo_unitario: 1.2 },
  { id: "ins-9", nome: "Papel Fotográfico Glossy 230g A4", categoria: "Papéis", unidade: "folha", quantidade_estoque: 150, quantidade_minima: 40, custo_unitario: 1.45 },
  { id: "ins-10", nome: "Papel Color Plus 180g A4", categoria: "Papéis", unidade: "folha", quantidade_estoque: 150, quantidade_minima: 40, custo_unitario: 1.1 },
  { id: "ins-11", nome: "Papel Color Plus 240g A4", categoria: "Papéis", unidade: "folha", quantidade_estoque: 100, quantidade_minima: 30, custo_unitario: 1.35 },
  { id: "ins-12", nome: "Papel Vegetal A4", categoria: "Papéis", unidade: "folha", quantidade_estoque: 100, quantidade_minima: 20, custo_unitario: 0.85 },
  { id: "ins-13", nome: "Papel Metalizado A4", categoria: "Papéis", unidade: "folha", quantidade_estoque: 80, quantidade_minima: 20, custo_unitario: 1.5 },
  { id: "ins-14", nome: "Papel Perolado A4", categoria: "Papéis", unidade: "folha", quantidade_estoque: 80, quantidade_minima: 20, custo_unitario: 1.4 },
  { id: "ins-15", nome: "Papel Adesivo A4", categoria: "Papéis", unidade: "folha", quantidade_estoque: 100, quantidade_minima: 25, custo_unitario: 1.3 },
  { id: "ins-16", nome: "Papel Contact Transparente", categoria: "Acabamento", unidade: "metro", quantidade_estoque: 20, quantidade_minima: 5, custo_unitario: 4.5 },
  { id: "ins-17", nome: "Acetato Transparente A4", categoria: "Acabamento", unidade: "folha", quantidade_estoque: 100, quantidade_minima: 25, custo_unitario: 1.8 },
  { id: "ins-18", nome: "Fita Banana Dupla Face", categoria: "Adesivos", unidade: "metro", quantidade_estoque: 30, quantidade_minima: 8, custo_unitario: 1.2 },
  { id: "ins-19", nome: "Fita Dupla Face Fina", categoria: "Adesivos", unidade: "metro", quantidade_estoque: 50, quantidade_minima: 10, custo_unitario: 0.65 },
  { id: "ins-20", nome: "Cola Branca", categoria: "Adesivos", unidade: "ml", quantidade_estoque: 1000, quantidade_minima: 200, custo_unitario: 0.03 },
  { id: "ins-21", nome: "Cola de Silicone Líquida", categoria: "Adesivos", unidade: "ml", quantidade_estoque: 500, quantidade_minima: 100, custo_unitario: 0.05 },
  { id: "ins-22", nome: "Cola Quente", categoria: "Adesivos", unidade: "unidade", quantidade_estoque: 100, quantidade_minima: 20, custo_unitario: 0.45 },
  { id: "ins-23", nome: "Fita Gorgurão 10mm", categoria: "Fitas", unidade: "metro", quantidade_estoque: 100, quantidade_minima: 20, custo_unitario: 0.85 },
  { id: "ins-24", nome: "Fita Gorgurão 15mm", categoria: "Fitas", unidade: "metro", quantidade_estoque: 100, quantidade_minima: 20, custo_unitario: 1.1 },
  { id: "ins-25", nome: "Fita Gorgurão 22mm", categoria: "Fitas", unidade: "metro", quantidade_estoque: 80, quantidade_minima: 20, custo_unitario: 1.45 },
  { id: "ins-26", nome: "Fita Cetim 7mm", categoria: "Fitas", unidade: "metro", quantidade_estoque: 100, quantidade_minima: 20, custo_unitario: 0.45 },
  { id: "ins-27", nome: "Fita Cetim 10mm", categoria: "Fitas", unidade: "metro", quantidade_estoque: 100, quantidade_minima: 20, custo_unitario: 0.6 },
  { id: "ins-28", nome: "Fita Cetim 15mm", categoria: "Fitas", unidade: "metro", quantidade_estoque: 80, quantidade_minima: 20, custo_unitario: 0.8 },
  { id: "ins-29", nome: "Fita de Organza", categoria: "Fitas", unidade: "metro", quantidade_estoque: 80, quantidade_minima: 20, custo_unitario: 0.75 },
  { id: "ins-30", nome: "Elástico Roliço", categoria: "Aviamentos", unidade: "metro", quantidade_estoque: 50, quantidade_minima: 10, custo_unitario: 0.4 },
  { id: "ins-31", nome: "Cordão de Algodão", categoria: "Aviamentos", unidade: "metro", quantidade_estoque: 50, quantidade_minima: 10, custo_unitario: 0.55 },
  { id: "ins-32", nome: "Barbante", categoria: "Aviamentos", unidade: "metro", quantidade_estoque: 100, quantidade_minima: 20, custo_unitario: 0.25 },
  { id: "ins-33", nome: "Palito de Churrasco", categoria: "Estrutura", unidade: "unidade", quantidade_estoque: 200, quantidade_minima: 50, custo_unitario: 0.12 },
  { id: "ins-34", nome: "Palito para Topper", categoria: "Estrutura", unidade: "unidade", quantidade_estoque: 200, quantidade_minima: 50, custo_unitario: 0.18 },
  { id: "ins-35", nome: "Canudo de Papel", categoria: "Estrutura", unidade: "unidade", quantidade_estoque: 100, quantidade_minima: 20, custo_unitario: 0.35 },
  { id: "ins-36", nome: "Tule", categoria: "Tecidos", unidade: "metro", quantidade_estoque: 20, quantidade_minima: 5, custo_unitario: 3.5 },
  { id: "ins-37", nome: "Manta Magnética", categoria: "Acabamento", unidade: "folha", quantidade_estoque: 50, quantidade_minima: 10, custo_unitario: 2.5 },
  { id: "ins-38", nome: "Imã Redondo", categoria: "Acabamento", unidade: "unidade", quantidade_estoque: 100, quantidade_minima: 20, custo_unitario: 0.35 },
  { id: "ins-39", nome: "Ilhós", categoria: "Acabamento", unidade: "unidade", quantidade_estoque: 200, quantidade_minima: 40, custo_unitario: 0.15 },
  { id: "ins-40", nome: "Tag de Papel Kraft", categoria: "Tags", unidade: "unidade", quantidade_estoque: 200, quantidade_minima: 50, custo_unitario: 0.25 },
  { id: "ins-41", nome: "Saquinho Transparente P", categoria: "Embalagem", unidade: "unidade", quantidade_estoque: 100, quantidade_minima: 20, custo_unitario: 0.35 },
  { id: "ins-42", nome: "Saquinho Transparente M", categoria: "Embalagem", unidade: "unidade", quantidade_estoque: 100, quantidade_minima: 20, custo_unitario: 0.45 },
  { id: "ins-43", nome: "Saquinho Transparente G", categoria: "Embalagem", unidade: "unidade", quantidade_estoque: 50, quantidade_minima: 10, custo_unitario: 0.65 },
  { id: "ins-44", nome: "Fita Adesiva Transparente", categoria: "Embalagem", unidade: "metro", quantidade_estoque: 50, quantidade_minima: 10, custo_unitario: 0.2 },
  { id: "ins-45", nome: "Papel Seda", categoria: "Embalagem", unidade: "folha", quantidade_estoque: 100, quantidade_minima: 20, custo_unitario: 0.35 },
  { id: "ins-46", nome: "Caixa de Papelão P", categoria: "Embalagem", unidade: "unidade", quantidade_estoque: 30, quantidade_minima: 5, custo_unitario: 2.5 },
  { id: "ins-47", nome: "Caixa de Papelão M", categoria: "Embalagem", unidade: "unidade", quantidade_estoque: 30, quantidade_minima: 5, custo_unitario: 3.5 },
  { id: "ins-48", nome: "Caixa de Papelão G", categoria: "Embalagem", unidade: "unidade", quantidade_estoque: 20, quantidade_minima: 5, custo_unitario: 5 },
  { id: "ins-49", nome: "Tinta de Impressão Preta", categoria: "Impressão", unidade: "ml", quantidade_estoque: 500, quantidade_minima: 100, custo_unitario: 0.18 },
  { id: "ins-50", nome: "Tinta de Impressão Ciano", categoria: "Impressão", unidade: "ml", quantidade_estoque: 500, quantidade_minima: 100, custo_unitario: 0.2 },
  { id: "ins-51", nome: "Tinta de Impressão Magenta", categoria: "Impressão", unidade: "ml", quantidade_estoque: 500, quantidade_minima: 100, custo_unitario: 0.2 },
  { id: "ins-52", nome: "Tinta de Impressão Amarela", categoria: "Impressão", unidade: "ml", quantidade_estoque: 500, quantidade_minima: 100, custo_unitario: 0.2 },
);

export const insumosLixeira: Insumo[] = [];
export const clientesLixeira: Cliente[] = [];
export const produtosLixeira: Produto[] = [];
export const pedidosLixeira: Pedido[] = [];

// Deleting never destroys data: the record moves to its trash list and can be
// restored with the same id, so links from other records stay valid.
function moverParaLixeira<T extends { id: string }>(origem: T[], lixeira: T[], id: string): boolean {
  const index = origem.findIndex((item) => item.id === id);

  if (index === -1) {
    return false;
  }

  const [removido] = origem.splice(index, 1);
  lixeira.unshift(removido);
  return true;
}

// A partial update must not erase fields the caller did not send.
function semIndefinidos<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, valor]) => valor !== undefined),
  ) as Partial<T>;
}

function restaurarDaLixeira<T extends { id: string }>(
  lixeira: T[],
  destino: T[],
  id: string,
): T | undefined {
  const index = lixeira.findIndex((item) => item.id === id);

  if (index === -1) {
    return undefined;
  }

  const [restaurado] = lixeira.splice(index, 1);
  destino.unshift(restaurado);
  return restaurado;
}

export const produtos: Produto[] = [
  {
    id: "prod-1",
    nome: "Caneca Personalizada",
    margem_desejada: 45,
    tempo_producao_minutos: 20,
    insumos: [
      { insumo_id: "ins-1", quantidade_por_unidade: 2 },
      { insumo_id: "ins-3", quantidade_por_unidade: 25 },
      { insumo_id: "ins-2", quantidade_por_unidade: 45 },
    ],
  },
  {
    id: "prod-2",
    nome: "Agenda com Nome",
    margem_desejada: 35,
    tempo_producao_minutos: 45,
    insumos: [
      { insumo_id: "ins-1", quantidade_por_unidade: 6 },
      { insumo_id: "ins-2", quantidade_por_unidade: 30 },
    ],
  },
];

export const pedidos: Pedido[] = [
  {
    id: "ped-1",
    cliente_id: "cli-1",
    produto_id: "prod-1",
    cores: "Azul e branco",
    texto_personalizacao: "Parabéns, Maria!",
    quantidade: 24,
    data_entrega: "2026-09-26",
    status: "pendente",
    valor_final: 280,
  },
  {
    id: "ped-2",
    cliente_id: "cli-2",
    produto_id: "prod-2",
    cores: "Bege",
    texto_personalizacao: "João, sucesso!",
    quantidade: 18,
    data_entrega: "2026-09-28",
    status: "em_producao",
    valor_final: 210,
  },
];

export function createCliente(input: { nome: string; contato: string }): Cliente {
  const cliente: Cliente = {
    id: crypto.randomUUID(),
    nome: input.nome,
    contato: input.contato,
  };

  clientes.push(cliente);
  return cliente;
}

export function updateCliente(
  id: string,
  input: Partial<Pick<Cliente, "nome" | "contato">>,
): Cliente | undefined {
  const index = clientes.findIndex((cliente) => cliente.id === id);

  if (index === -1) {
    return undefined;
  }

  clientes[index] = { ...clientes[index], ...semIndefinidos(input) };
  return clientes[index];
}

export function deleteCliente(id: string): boolean {
  return moverParaLixeira(clientes, clientesLixeira, id);
}

export function restaurarCliente(id: string): Cliente | undefined {
  return restaurarDaLixeira(clientesLixeira, clientes, id);
}

export function createInsumo(input: {
  nome: string;
  categoria?: string;
  unidade: string;
  quantidade_estoque: number;
  quantidade_minima: number;
  custo_unitario: number;
}): Insumo {
  const item: Insumo = {
    id: crypto.randomUUID(),
    nome: input.nome,
    categoria: input.categoria,
    unidade: input.unidade,
    quantidade_estoque: input.quantidade_estoque,
    quantidade_minima: input.quantidade_minima,
    custo_unitario: input.custo_unitario,
  };

  insumos.push(item);
  return item;
}

export function updateInsumo(
  id: string,
  input: Partial<Pick<Insumo, "nome" | "categoria" | "unidade" | "quantidade_estoque" | "quantidade_minima" | "custo_unitario">>,
): Insumo | undefined {
  const index = insumos.findIndex((insumo) => insumo.id === id);

  if (index === -1) {
    return undefined;
  }

  insumos[index] = { ...insumos[index], ...semIndefinidos(input) };
  return insumos[index];
}

export function deleteInsumo(id: string): boolean {
  return moverParaLixeira(insumos, insumosLixeira, id);
}

export function restaurarInsumo(id: string): Insumo | undefined {
  return restaurarDaLixeira(insumosLixeira, insumos, id);
}

export function createProduto(input: {
  nome: string;
  margem_desejada: number;
  tempo_producao_minutos?: number;
  insumos: ProdutoInsumo[];
}): Produto {
  const produto: Produto = {
    id: crypto.randomUUID(),
    nome: input.nome,
    margem_desejada: input.margem_desejada,
    tempo_producao_minutos: input.tempo_producao_minutos ?? 0,
    insumos: input.insumos,
  };

  produtos.push(produto);
  return produto;
}

export function updateProduto(
  id: string,
  input: Partial<Pick<Produto, "nome" | "margem_desejada" | "tempo_producao_minutos" | "insumos">>,
): Produto | undefined {
  const index = produtos.findIndex((produto) => produto.id === id);

  if (index === -1) {
    return undefined;
  }

  produtos[index] = { ...produtos[index], ...semIndefinidos(input) };
  return produtos[index];
}

export function deleteProduto(id: string): boolean {
  return moverParaLixeira(produtos, produtosLixeira, id);
}

export function restaurarProduto(id: string): Produto | undefined {
  return restaurarDaLixeira(produtosLixeira, produtos, id);
}

export function createPedido(input: {
  cliente_id: string;
  produto_id: string;
  cores: string;
  texto_personalizacao: string;
  quantidade: number;
  data_entrega: string;
  status: StatusPedido;
  valor_final: number;
}): Pedido {
  const pedido: Pedido = {
    id: crypto.randomUUID(),
    cliente_id: input.cliente_id,
    produto_id: input.produto_id,
    cores: input.cores,
    texto_personalizacao: input.texto_personalizacao,
    quantidade: input.quantidade,
    data_entrega: input.data_entrega,
    status: input.status,
    valor_final: input.valor_final,
  };

  pedidos.push(pedido);
  return pedido;
}

export function updatePedido(
  id: string,
  input: Partial<Pick<Pedido, "cliente_id" | "produto_id" | "cores" | "texto_personalizacao" | "quantidade" | "data_entrega" | "status" | "valor_final">>,
): Pedido | undefined {
  const index = pedidos.findIndex((pedido) => pedido.id === id);

  if (index === -1) {
    return undefined;
  }

  pedidos[index] = { ...pedidos[index], ...semIndefinidos(input) };
  return pedidos[index];
}

export function deletePedido(id: string): boolean {
  return moverParaLixeira(pedidos, pedidosLixeira, id);
}

export function restaurarPedido(id: string): Pedido | undefined {
  return restaurarDaLixeira(pedidosLixeira, pedidos, id);
}

export function calcularCustoProdutoProduto(produto: Produto): number {
  const mapaInsumos = new Map(insumos.map((insumo) => [insumo.id, insumo]));

  return produto.insumos.reduce((total, item) => {
    const insumo = mapaInsumos.get(item.insumo_id);

    if (!insumo) {
      return total;
    }

    return total + insumo.custo_unitario * item.quantidade_por_unidade;
  }, 0);
}

// Single row (id = 1 in Supabase). Starts at zero so pricing works before the
// owner configures anything.
export const configuracoes: Configuracoes = { ...CONFIGURACOES_PADRAO };

export function updateConfiguracoes(input: Configuracoes): Configuracoes {
  Object.assign(configuracoes, input);
  return { ...configuracoes };
}
