export interface InsumoProduto {
  nome: string;
  custoUnitario: number;
  quantidadePorUnidade: number;
}

export function calcularCustoProduto(insumos: readonly InsumoProduto[]): number {
  const custoTotal = insumos.reduce(
    (total, insumo) => total + insumo.custoUnitario * insumo.quantidadePorUnidade,
    0,
  );

  return Number(custoTotal.toFixed(2));
}

export function calcularPrecoSugerido(
  custo: number,
  margemDesejada: number,
): number {
  const preco = custo * (1 + margemDesejada / 100);
  return Number(preco.toFixed(2));
}

export function calcularValorPedido(
  custoUnitario: number,
  margemDesejada: number,
  quantidade: number,
): number {
  const valorUnitario = calcularPrecoSugerido(custoUnitario, margemDesejada);
  return Number((valorUnitario * quantidade).toFixed(2));
}

export function calcularMargemReal(custo: number, precoPraticado: number): number {
  if (custo === 0) {
    return 0;
  }

  const margem = ((precoPraticado / custo) - 1) * 100;
  return Number(margem.toFixed(2));
}

export type Configuracoes = {
  valor_hora_trabalho: number;
  percentual_perdas: number;
  percentual_custos_fixos: number;
};

// Until the owner fills in the Configurações screen every factor is zero, so
// the price is simply insumos + margin.
export const CONFIGURACOES_PADRAO: Configuracoes = {
  valor_hora_trabalho: 0,
  percentual_perdas: 0,
  percentual_custos_fixos: 0,
};

export type Precificacao = {
  custoInsumos: number;
  custoMaoObra: number;
  custoBase: number;
  custoComPerdas: number;
  custoTotal: number;
  precoSugerido: number;
};

const arredondar = (valor: number) => Number(valor.toFixed(2));

// Cascade: each layer applies on top of the previous one. Intermediate values
// are kept unrounded so rounding happens once per displayed figure.
export function calcularPrecificacao(entrada: {
  custoInsumos: number;
  tempoProducaoMinutos: number;
  margemDesejada: number;
  configuracoes?: Configuracoes;
}): Precificacao {
  const config = entrada.configuracoes ?? CONFIGURACOES_PADRAO;
  const custoMaoObra = (entrada.tempoProducaoMinutos / 60) * config.valor_hora_trabalho;
  const custoBase = entrada.custoInsumos + custoMaoObra;
  const custoComPerdas = custoBase * (1 + config.percentual_perdas / 100);
  const custoTotal = custoComPerdas * (1 + config.percentual_custos_fixos / 100);

  return {
    custoInsumos: arredondar(entrada.custoInsumos),
    custoMaoObra: arredondar(custoMaoObra),
    custoBase: arredondar(custoBase),
    custoComPerdas: arredondar(custoComPerdas),
    custoTotal: arredondar(custoTotal),
    precoSugerido: arredondar(custoTotal * (1 + entrada.margemDesejada / 100)),
  };
}

type InsumoCadastro = {
  id: string;
  nome: string;
  unidade: string;
  custo_unitario: number;
};

type ProdutoComposicao = {
  margem_desejada: number;
  tempo_producao_minutos?: number;
  insumos: { insumo_id: string; quantidade_por_unidade: number }[];
};

export type LinhaProdutoDetalhada = {
  insumo_id: string;
  nome: string;
  unidade: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  situacao: "ok" | "removido" | "inexistente";
};

export type ProdutoDetalhado = Precificacao & {
  linhas: LinhaProdutoDetalhada[];
  /** Custo total (insumos + mão de obra + perdas + custos fixos). */
  custo: number;
  lucroUnitario: number;
  insumosComProblema: LinhaProdutoDetalhada[];
};

// Always derived from the current insumo costs and configuration, so any
// change is reflected immediately. Lines pointing to a removed or unknown
// insumo cost nothing and are reported so the owner can fix the composition.
export function detalharProduto(
  produto: ProdutoComposicao,
  insumosAtivos: InsumoCadastro[],
  insumosRemovidos: InsumoCadastro[] = [],
  configuracoes: Configuracoes = CONFIGURACOES_PADRAO,
): ProdutoDetalhado {
  const ativos = new Map(insumosAtivos.map((insumo) => [insumo.id, insumo]));
  const removidos = new Map(insumosRemovidos.map((insumo) => [insumo.id, insumo]));

  const linhas = produto.insumos.map((item): LinhaProdutoDetalhada => {
    const ativo = ativos.get(item.insumo_id);
    const removido = removidos.get(item.insumo_id);
    const referencia = ativo ?? removido;
    const custoUnitario = ativo?.custo_unitario ?? 0;

    return {
      insumo_id: item.insumo_id,
      nome: referencia?.nome ?? "Insumo não encontrado",
      unidade: referencia?.unidade ?? "",
      quantidade: item.quantidade_por_unidade,
      custoUnitario,
      custoTotal: Number((custoUnitario * item.quantidade_por_unidade).toFixed(4)),
      situacao: ativo ? "ok" : removido ? "removido" : "inexistente",
    };
  });

  const custoInsumos = linhas.reduce((total, linha) => total + linha.custoUnitario * linha.quantidade, 0);
  const precificacao = calcularPrecificacao({
    custoInsumos,
    tempoProducaoMinutos: produto.tempo_producao_minutos ?? 0,
    margemDesejada: produto.margem_desejada,
    configuracoes,
  });

  return {
    ...precificacao,
    linhas,
    custo: precificacao.custoTotal,
    lucroUnitario: arredondar(precificacao.precoSugerido - precificacao.custoTotal),
    insumosComProblema: linhas.filter((linha) => linha.situacao !== "ok"),
  };
}

export function calcularValorPedidoProduto(
  produto: ProdutoComposicao,
  insumosAtivos: InsumoCadastro[],
  quantidade: number,
  configuracoes: Configuracoes = CONFIGURACOES_PADRAO,
): number {
  const { precoSugerido } = detalharProduto(produto, insumosAtivos, [], configuracoes);
  return arredondar(precoSugerido * quantidade);
}
