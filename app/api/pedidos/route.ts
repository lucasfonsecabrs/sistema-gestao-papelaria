import { NextResponse } from "next/server";

import { itensIguais, type ItemPedido } from "@/lib/pedidos";
import { calcularValorPedidoProduto } from "@/lib/precificacao";
import { atualizar, criar, idsAtivos, listar, obter, obterConfiguracoes } from "@/lib/repositorio";
import {
  lerId,
  lerPayload,
  respostaErro,
  responderExclusao,
  responderListagem,
  responderRestauracao,
} from "@/lib/rotas";
import { validarPedido } from "@/lib/validacao";

export async function GET(request: Request) {
  return responderListagem("pedidos", request);
}

// The order value is always computed here from each product's composition,
// current insumo costs, pricing settings, margin and quantity, never trusted
// from the client. It is the sum of the items.
async function calcularValor(itens: ItemPedido[]): Promise<number | null> {
  const [ativos, removidos, insumos, configuracoes] = await Promise.all([
    listar("produtos"),
    listar("produtos", { lixeira: true }),
    listar("insumos"),
    obterConfiguracoes(),
  ]);
  const produtos = new Map([...removidos, ...ativos].map((produto) => [produto.id, produto]));
  let total = 0;

  for (const item of itens) {
    const produto = produtos.get(item.produto_id);

    if (!produto) {
      return null;
    }

    total += calcularValorPedidoProduto(produto, insumos, item.quantidade, configuracoes);
  }

  return Number(total.toFixed(2));
}

async function vinculos() {
  const [clientes, produtos] = await Promise.all([idsAtivos("clientes"), idsAtivos("produtos")]);
  return { clientes, produtos };
}

export async function POST(request: Request) {
  const payload = await lerPayload(request);

  if (!payload) {
    return respostaErro("Dados inválidos.");
  }

  if (payload.acao === "restaurar") {
    return responderRestauracao("pedidos", lerId(payload.id), "Pedido");
  }

  const resultado = validarPedido(payload, await vinculos());

  if (!resultado.ok) {
    return respostaErro(resultado.erro);
  }

  const valorFinal = await calcularValor(resultado.dados.itens);

  if (valorFinal === null) {
    return respostaErro("Produto não encontrado.");
  }

  return NextResponse.json(
    await criar("pedidos", { ...resultado.dados, valor_final: valorFinal }),
    { status: 201 },
  );
}

export async function PUT(request: Request) {
  const payload = await lerPayload(request);
  const pedidoId = lerId(payload?.id);

  if (!payload || !pedidoId) {
    return respostaErro("Pedido não informado");
  }

  const atual = await obter("pedidos", pedidoId);

  if (!atual) {
    return respostaErro("Pedido não encontrado", 404);
  }

  const resultado = validarPedido(payload, await vinculos(), atual);

  if (!resultado.ok) {
    return respostaErro(resultado.erro);
  }

  // Keep the agreed price unless what is being sold changed.
  let valorFinal = atual.valor_final;

  if (!itensIguais(resultado.dados.itens, atual.itens)) {
    const recalculado = await calcularValor(resultado.dados.itens);

    if (recalculado === null) {
      return respostaErro("Produto não encontrado.");
    }

    valorFinal = recalculado;
  }

  const pedidoAtualizado = await atualizar("pedidos", pedidoId, {
    ...resultado.dados,
    valor_final: valorFinal,
  });

  if (!pedidoAtualizado) {
    return respostaErro("Pedido não encontrado", 404);
  }

  return NextResponse.json(pedidoAtualizado);
}

export async function DELETE(request: Request) {
  return responderExclusao("pedidos", request, "Pedido", { success: true });
}
