import { calcularReposicao, calcularStatusEstoque, type StatusEstoque } from "./estoque";
import { calcularUrgenciaPedido, type StatusPedido, type UrgenciaPedido } from "./pedidos";
import { CONFIGURACOES_PADRAO, detalharProduto, type Configuracoes, type ProdutoDetalhado } from "./precificacao";
import type { Cliente, Insumo, Pedido, Produto } from "./store";
import { normalizarTexto } from "./validacao";

export type FiltroStatusPedido = "todos" | "abertos" | StatusPedido;

export type FiltrosPedido = {
  busca: string;
  status: FiltroStatusPedido;
  de: string;
  ate: string;
  ordem: "entrega_asc" | "entrega_desc";
  clienteId: string;
  somenteAtencao: boolean;
};

export const FILTROS_PEDIDO_PADRAO: FiltrosPedido = {
  busca: "",
  status: "abertos",
  de: "",
  ate: "",
  ordem: "entrega_asc",
  clienteId: "",
  somenteAtencao: false,
};

export type FiltroSituacaoEstoque = "todos" | "alerta" | StatusEstoque;

export type FiltrosEstoque = {
  busca: string;
  categoria: string;
  situacao: FiltroSituacaoEstoque;
};

export const FILTROS_ESTOQUE_PADRAO: FiltrosEstoque = {
  busca: "",
  categoria: "",
  situacao: "todos",
};

export function contem(texto: string, busca: string): boolean {
  return normalizarTexto(texto).includes(normalizarTexto(busca));
}

export function pedidoAberto(pedido: Pick<Pedido, "status">): boolean {
  return pedido.status !== "entregue";
}

// Delivered orders are never late or urgent.
export function urgenciaDoPedido(pedido: Pedido, hoje: Date): UrgenciaPedido {
  return pedidoAberto(pedido) ? calcularUrgenciaPedido(pedido.data_entrega, hoje) : "tranquilo";
}

export function precisaAtencao(pedido: Pedido, hoje: Date): boolean {
  const urgencia = urgenciaDoPedido(pedido, hoje);
  return urgencia === "atrasado" || urgencia === "urgente";
}

export function filtrarPedidos(
  pedidos: readonly Pedido[],
  filtros: FiltrosPedido,
  nomes: { cliente: (id: string) => string; produto: (id: string) => string },
  hoje: Date,
): Pedido[] {
  const busca = filtros.busca.trim();

  return pedidos
    .filter((pedido) => {
      if (filtros.status === "abertos" && !pedidoAberto(pedido)) return false;
      if (filtros.status !== "todos" && filtros.status !== "abertos" && pedido.status !== filtros.status) return false;
      if (filtros.clienteId && pedido.cliente_id !== filtros.clienteId) return false;
      if (filtros.de && pedido.data_entrega < filtros.de) return false;
      if (filtros.ate && pedido.data_entrega > filtros.ate) return false;
      if (filtros.somenteAtencao && !precisaAtencao(pedido, hoje)) return false;

      if (!busca) return true;

      return [
        nomes.cliente(pedido.cliente_id),
        nomes.produto(pedido.produto_id),
        pedido.cores,
        pedido.texto_personalizacao,
      ].some((texto) => contem(texto, busca));
    })
    .sort((a, b) => {
      const ordem = a.data_entrega.localeCompare(b.data_entrega);
      return filtros.ordem === "entrega_asc" ? ordem : -ordem;
    });
}

export type InsumoComSituacao = Insumo & {
  situacao: StatusEstoque;
  reposicao: number;
};

export function situacaoInsumos(insumos: readonly Insumo[]): InsumoComSituacao[] {
  return insumos.map((insumo) => ({
    ...insumo,
    situacao: calcularStatusEstoque(insumo.quantidade_estoque, insumo.quantidade_minima),
    reposicao: calcularReposicao(insumo.quantidade_estoque, insumo.quantidade_minima),
  }));
}

export function filtrarInsumos(
  insumos: readonly InsumoComSituacao[],
  filtros: FiltrosEstoque,
): InsumoComSituacao[] {
  return insumos.filter((insumo) => {
    if (filtros.categoria && (insumo.categoria ?? "Outros") !== filtros.categoria) return false;
    if (filtros.situacao === "alerta" && insumo.situacao === "normal") return false;
    if (filtros.situacao !== "todos" && filtros.situacao !== "alerta" && insumo.situacao !== filtros.situacao) return false;
    return !filtros.busca.trim() || contem(insumo.nome, filtros.busca);
  });
}

export type ResumoCliente = {
  cliente: Cliente;
  totalPedidos: number;
  pedidosAbertos: number;
  ultimoPedido?: Pedido;
};

export function resumirClientes(clientes: readonly Cliente[], pedidos: readonly Pedido[]): ResumoCliente[] {
  return clientes.map((cliente) => {
    const doCliente = pedidos.filter((pedido) => pedido.cliente_id === cliente.id);

    return {
      cliente,
      totalPedidos: doCliente.length,
      pedidosAbertos: doCliente.filter(pedidoAberto).length,
      ultimoPedido: doCliente.reduce<Pedido | undefined>(
        (ultimo, pedido) => (!ultimo || pedido.data_entrega > ultimo.data_entrega ? pedido : ultimo),
        undefined,
      ),
    };
  });
}

export type ProdutoComDetalhe = Produto & { detalhe: ProdutoDetalhado };

export function detalharProdutos(
  produtos: readonly Produto[],
  insumos: readonly Insumo[],
  insumosRemovidos: readonly Insumo[],
  configuracoes: Configuracoes = CONFIGURACOES_PADRAO,
): ProdutoComDetalhe[] {
  return produtos.map((produto) => ({
    ...produto,
    detalhe: detalharProduto(produto, [...insumos], [...insumosRemovidos], configuracoes),
  }));
}

export function resumirPainel(
  pedidos: readonly Pedido[],
  produtos: readonly ProdutoComDetalhe[],
  insumos: readonly InsumoComSituacao[],
  hoje: Date,
) {
  const abertos = pedidos.filter(pedidoAberto);
  const atencao = abertos
    .filter((pedido) => precisaAtencao(pedido, hoje))
    .sort((a, b) => a.data_entrega.localeCompare(b.data_entrega));
  const alertasEstoque = insumos
    .filter((insumo) => insumo.situacao !== "normal")
    .sort((a, b) => (a.situacao === b.situacao ? a.nome.localeCompare(b.nome) : a.situacao === "critico" ? -1 : 1));

  return {
    abertos,
    atencao,
    atrasados: atencao.filter((pedido) => urgenciaDoPedido(pedido, hoje) === "atrasado").length,
    faturamentoAberto: abertos.reduce((total, pedido) => total + pedido.valor_final, 0),
    margemMedia:
      produtos.length > 0
        ? produtos.reduce((total, produto) => total + produto.margem_desejada, 0) / produtos.length
        : 0,
    alertasEstoque,
    criticos: alertasEstoque.filter((insumo) => insumo.situacao === "critico").length,
    produtosComProblema: produtos.filter((produto) => produto.detalhe.insumosComProblema.length > 0),
  };
}
