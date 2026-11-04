import { adicionarDias, paraDataIso } from "./pedidos";
import { calcularValorPedidoProduto, CONFIGURACOES_PADRAO, type Configuracoes } from "./precificacao";
import type { Cliente, Insumo, Pedido, Produto } from "./store";

export const VALIDADE_ORCAMENTO_DIAS = 7;

export type LinhaOrcamento = {
  produto: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
};

export type Orcamento = {
  numero: string;
  emissao: string;
  validade: string;
  cliente: Cliente | null;
  linhas: LinhaOrcamento[];
  total: number;
  cores: string;
  textoPersonalizacao: string;
  dataEntrega: string;
};

const arredondar = (valor: number) => Number(valor.toFixed(2));

// The quote always matches the order total. Each line's share comes from the
// current price of its product, and the last line absorbs the rounding so the
// lines add up exactly to the stored order value.
export function montarOrcamento(
  pedido: Pedido,
  dados: { produtos: Produto[]; insumos: Insumo[]; clientes: Cliente[]; configuracoes?: Configuracoes },
  hoje: Date = new Date(),
): Orcamento {
  const produtos = new Map(dados.produtos.map((produto) => [produto.id, produto]));
  const configuracoes = dados.configuracoes ?? CONFIGURACOES_PADRAO;

  const base = pedido.itens.map((item) => {
    const produto = produtos.get(item.produto_id);
    return {
      produto: produto?.nome ?? "Produto não encontrado",
      quantidade: item.quantidade,
      valorAtual: produto ? calcularValorPedidoProduto(produto, dados.insumos, item.quantidade, configuracoes) : 0,
    };
  });

  const somaAtual = base.reduce((total, linha) => total + linha.valorAtual, 0);
  let acumulado = 0;
  const linhas = base.map((linha, indice): LinhaOrcamento => {
    const ultima = indice === base.length - 1;
    const subtotal =
      somaAtual === 0
        ? ultima ? pedido.valor_final : 0
        : ultima
          ? arredondar(pedido.valor_final - acumulado)
          : arredondar((pedido.valor_final * linha.valorAtual) / somaAtual);
    acumulado = arredondar(acumulado + subtotal);
    return {
      produto: linha.produto,
      quantidade: linha.quantidade,
      valorUnitario: arredondar(subtotal / linha.quantidade),
      subtotal,
    };
  });

  return {
    numero: `ORC-${pedido.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
    emissao: paraDataIso(hoje),
    validade: paraDataIso(adicionarDias(hoje, VALIDADE_ORCAMENTO_DIAS)),
    cliente: dados.clientes.find((cliente) => cliente.id === pedido.cliente_id) ?? null,
    linhas,
    total: pedido.valor_final,
    cores: pedido.cores,
    textoPersonalizacao: pedido.texto_personalizacao,
    dataEntrega: pedido.data_entrega,
  };
}
