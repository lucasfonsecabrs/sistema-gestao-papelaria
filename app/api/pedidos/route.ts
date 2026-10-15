import { NextResponse } from "next/server";

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

// The order value is always computed here from the product composition,
// current insumo costs, pricing settings, margin and quantity, never trusted
// from the client.
async function calcularValor(produtoId: string, quantidade: number): Promise<number | null> {
  const produto =
    (await obter("produtos", produtoId)) ??
    (await listar("produtos", { lixeira: true })).find((item) => item.id === produtoId);

  if (!produto) {
    return null;
  }

  return calcularValorPedidoProduto(produto, await listar("insumos"), quantidade, await obterConfiguracoes());
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

  const valorFinal = await calcularValor(resultado.dados.produto_id, resultado.dados.quantidade);

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

  if (
    resultado.dados.produto_id !== atual.produto_id ||
    resultado.dados.quantidade !== atual.quantidade
  ) {
    const recalculado = await calcularValor(resultado.dados.produto_id, resultado.dados.quantidade);

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
