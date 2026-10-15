import { CONFIGURACOES_PADRAO, type Configuracoes } from "./precificacao";
import { getSupabaseClient } from "./supabase";
import {
  clientes,
  clientesLixeira,
  configuracoes as configuracoesMemoria,
  createCliente,
  createInsumo,
  createPedido,
  createProduto,
  deleteCliente,
  deleteInsumo,
  deletePedido,
  deleteProduto,
  insumos,
  insumosLixeira,
  pedidos,
  pedidosLixeira,
  produtos,
  produtosLixeira,
  restaurarCliente,
  restaurarInsumo,
  restaurarPedido,
  restaurarProduto,
  updateCliente,
  updateConfiguracoes,
  updateInsumo,
  updatePedido,
  updateProduto,
  type Cliente,
  type Insumo,
  type Pedido,
  type Produto,
  type ProdutoInsumo,
} from "./store";

export type Registros = {
  clientes: Cliente;
  insumos: Insumo;
  produtos: Produto;
  pedidos: Pedido;
};

export type Tabela = keyof Registros;

type Dados<T extends Tabela> = Omit<Registros[T], "id">;

type Memoria<T extends Tabela> = {
  ativos: Registros[T][];
  lixeira: Registros[T][];
  criar: (dados: Dados<T>) => Registros[T];
  atualizar: (id: string, dados: Partial<Dados<T>>) => Registros[T] | undefined;
  excluir: (id: string) => boolean;
  restaurar: (id: string) => Registros[T] | undefined;
};

const memoria: { [T in Tabela]: Memoria<T> } = {
  clientes: {
    ativos: clientes,
    lixeira: clientesLixeira,
    criar: createCliente,
    atualizar: updateCliente,
    excluir: deleteCliente,
    restaurar: restaurarCliente,
  },
  insumos: {
    ativos: insumos,
    lixeira: insumosLixeira,
    criar: createInsumo,
    atualizar: updateInsumo,
    excluir: deleteInsumo,
    restaurar: restaurarInsumo,
  },
  produtos: {
    ativos: produtos,
    lixeira: produtosLixeira,
    criar: createProduto,
    atualizar: updateProduto,
    excluir: deleteProduto,
    restaurar: restaurarProduto,
  },
  pedidos: {
    ativos: pedidos,
    lixeira: pedidosLixeira,
    criar: createPedido,
    atualizar: updatePedido,
    excluir: deletePedido,
    restaurar: restaurarPedido,
  },
};

type Supabase = NonNullable<ReturnType<typeof getSupabaseClient>>;
type RespostaSupabase<R> = { data: R | null; error: unknown };
type Linha = Record<string, unknown>;

const SEM_RESULTADO = Symbol("sem-resultado");

// Supabase is used when configured. If the call fails (tables or the
// `excluido_em` column not created yet, network error) the in-memory store
// answers instead, as the routes always did. See supabase/schema.sql.
async function viaSupabase<R>(
  origem: string,
  consulta: (db: Supabase) => PromiseLike<RespostaSupabase<R>>,
): Promise<R | null | typeof SEM_RESULTADO> {
  const db = getSupabaseClient();

  if (!db) {
    return SEM_RESULTADO;
  }

  try {
    const { data, error } = await consulta(db);

    if (!error) {
      return data;
    }

    console.warn(`[supabase] ${origem}: usando dados em memória.`, error);
  } catch (error) {
    console.warn(`[supabase] ${origem}: usando dados em memória.`, error);
  }

  return SEM_RESULTADO;
}

// In the database the composition of a product lives in `produto_insumos`;
// the app works with it embedded as `produto.insumos`.
const SELECAO: Record<Tabela, string> = {
  clientes: "*",
  insumos: "*",
  pedidos: "*",
  produtos: "*, produto_insumos(insumo_id, quantidade_por_unidade)",
};

function doBanco<T extends Tabela>(tabela: T, linha: Linha): Registros[T] {
  if (tabela !== "produtos") {
    return linha as unknown as Registros[T];
  }

  const { produto_insumos: composicao, ...produto } = linha;
  return { ...produto, insumos: (composicao as ProdutoInsumo[] | null) ?? [] } as unknown as Registros[T];
}

function separarComposicao(tabela: Tabela, dados: Linha): { colunas: Linha; insumos?: ProdutoInsumo[] } {
  if (tabela !== "produtos") {
    return { colunas: dados };
  }

  const { insumos, ...colunas } = dados;
  return { colunas, insumos: insumos as ProdutoInsumo[] | undefined };
}

async function gravarComposicao(
  db: Supabase,
  produtoId: string,
  insumos: ProdutoInsumo[],
): Promise<RespostaSupabase<true>> {
  const limpeza = await db.from("produto_insumos").delete().eq("produto_id", produtoId);

  if (limpeza.error || insumos.length === 0) {
    return { data: true, error: limpeza.error };
  }

  const { error } = await db
    .from("produto_insumos")
    .insert(insumos.map((item) => ({ produto_id: produtoId, ...item })));
  return { data: true, error };
}

export async function listar<T extends Tabela>(
  tabela: T,
  opcoes: { lixeira?: boolean } = {},
): Promise<Registros[T][]> {
  const remoto = await viaSupabase(tabela, (db) => {
    const query = db.from(tabela).select(SELECAO[tabela]);
    return opcoes.lixeira ? query.not("excluido_em", "is", null) : query.is("excluido_em", null);
  });

  if (remoto !== SEM_RESULTADO) {
    return ((remoto ?? []) as unknown as Linha[]).map((linha) => doBanco(tabela, linha));
  }

  return [...(opcoes.lixeira ? memoria[tabela].lixeira : memoria[tabela].ativos)];
}

export async function obter<T extends Tabela>(
  tabela: T,
  id: string,
): Promise<Registros[T] | undefined> {
  const remoto = await viaSupabase(tabela, (db) =>
    db.from(tabela).select(SELECAO[tabela]).eq("id", id).is("excluido_em", null).maybeSingle(),
  );

  if (remoto !== SEM_RESULTADO) {
    return remoto ? doBanco(tabela, remoto as unknown as Linha) : undefined;
  }

  return memoria[tabela].ativos.find((item) => item.id === id);
}

export async function criar<T extends Tabela>(tabela: T, dados: Dados<T>): Promise<Registros[T]> {
  const { colunas, insumos } = separarComposicao(tabela, dados as Linha);
  const remoto = await viaSupabase<Linha>(tabela, async (db) => {
    const inserido = await db.from(tabela).insert(colunas).select("*").single();

    if (inserido.error || !insumos) {
      return inserido;
    }

    const composicao = await gravarComposicao(db, String(inserido.data.id), insumos);
    return composicao.error
      ? { data: null, error: composicao.error }
      : { data: { ...inserido.data, produto_insumos: insumos }, error: null };
  });

  if (remoto !== SEM_RESULTADO && remoto) {
    return doBanco(tabela, remoto);
  }

  return memoria[tabela].criar(dados);
}

export async function atualizar<T extends Tabela>(
  tabela: T,
  id: string,
  dados: Partial<Dados<T>>,
): Promise<Registros[T] | undefined> {
  const { colunas, insumos } = separarComposicao(tabela, dados as Linha);
  const remoto = await viaSupabase<Linha>(tabela, async (db) => {
    const atualizado = await db
      .from(tabela)
      .update(colunas)
      .eq("id", id)
      .is("excluido_em", null)
      .select(SELECAO[tabela])
      .maybeSingle();

    if (atualizado.error || !atualizado.data || !insumos) {
      return { data: atualizado.data as unknown as Linha | null, error: atualizado.error };
    }

    const composicao = await gravarComposicao(db, id, insumos);
    return composicao.error
      ? { data: null, error: composicao.error }
      : { data: { ...(atualizado.data as unknown as Linha), produto_insumos: insumos }, error: null };
  });

  if (remoto !== SEM_RESULTADO) {
    return remoto ? doBanco(tabela, remoto) : undefined;
  }

  return memoria[tabela].atualizar(id, dados);
}

export async function excluir(tabela: Tabela, id: string): Promise<boolean> {
  const remoto = await viaSupabase(tabela, (db) =>
    db
      .from(tabela)
      .update({ excluido_em: new Date().toISOString() })
      .eq("id", id)
      .is("excluido_em", null)
      .select("id")
      .maybeSingle(),
  );

  if (remoto !== SEM_RESULTADO) {
    return Boolean(remoto);
  }

  return memoria[tabela].excluir(id);
}

export async function restaurar<T extends Tabela>(
  tabela: T,
  id: string,
): Promise<Registros[T] | undefined> {
  const remoto = await viaSupabase(tabela, (db) =>
    db
      .from(tabela)
      .update({ excluido_em: null })
      .eq("id", id)
      .not("excluido_em", "is", null)
      .select(SELECAO[tabela])
      .maybeSingle(),
  );

  if (remoto !== SEM_RESULTADO) {
    return remoto ? doBanco(tabela, remoto as unknown as Linha) : undefined;
  }

  return memoria[tabela].restaurar(id);
}

export async function idsAtivos(tabela: Tabela): Promise<Set<string>> {
  return new Set((await listar(tabela)).map((item) => item.id));
}

const COLUNAS_CONFIGURACAO = "valor_hora_trabalho, percentual_perdas, percentual_custos_fixos";

function configuracaoDoBanco(linha: Linha | null): Configuracoes {
  if (!linha) {
    return { ...CONFIGURACOES_PADRAO };
  }

  return {
    valor_hora_trabalho: Number(linha.valor_hora_trabalho ?? 0),
    percentual_perdas: Number(linha.percentual_perdas ?? 0),
    percentual_custos_fixos: Number(linha.percentual_custos_fixos ?? 0),
  };
}

export async function obterConfiguracoes(): Promise<Configuracoes> {
  const remoto = await viaSupabase("configuracoes", (db) =>
    db.from("configuracoes").select(COLUNAS_CONFIGURACAO).eq("id", 1).maybeSingle(),
  );

  if (remoto !== SEM_RESULTADO) {
    return configuracaoDoBanco(remoto as Linha | null);
  }

  return { ...configuracoesMemoria };
}

export async function salvarConfiguracoes(dados: Configuracoes): Promise<Configuracoes> {
  const remoto = await viaSupabase("configuracoes", (db) =>
    db.from("configuracoes").upsert({ id: 1, ...dados }).select(COLUNAS_CONFIGURACAO).single(),
  );

  if (remoto !== SEM_RESULTADO && remoto) {
    return configuracaoDoBanco(remoto as Linha);
  }

  return updateConfiguracoes(dados);
}
