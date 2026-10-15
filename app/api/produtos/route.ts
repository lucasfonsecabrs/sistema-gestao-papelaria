import { NextResponse } from "next/server";

import { atualizar, criar, idsAtivos, obter } from "@/lib/repositorio";
import {
  lerId,
  lerPayload,
  respostaErro,
  responderExclusao,
  responderListagem,
  responderRestauracao,
} from "@/lib/rotas";
import { validarProduto } from "@/lib/validacao";

export async function GET(request: Request) {
  return responderListagem("produtos", request);
}

export async function POST(request: Request) {
  const payload = await lerPayload(request);

  if (!payload) {
    return respostaErro("Dados inválidos.");
  }

  if (payload.acao === "restaurar") {
    return responderRestauracao("produtos", lerId(payload.id), "Produto");
  }

  const resultado = validarProduto(payload, await idsAtivos("insumos"));

  if (!resultado.ok) {
    return respostaErro(resultado.erro);
  }

  return NextResponse.json(await criar("produtos", resultado.dados), { status: 201 });
}

export async function PUT(request: Request) {
  const payload = await lerPayload(request);
  const id = lerId(payload?.id);

  if (!payload || !id) {
    return respostaErro("ID do produto obrigatório.");
  }

  const atual = await obter("produtos", id);

  if (!atual) {
    return respostaErro("Produto não encontrado.", 404);
  }

  const resultado = validarProduto(payload, await idsAtivos("insumos"), atual);

  if (!resultado.ok) {
    return respostaErro(resultado.erro);
  }

  const atualizado = await atualizar("produtos", id, resultado.dados);

  if (!atualizado) {
    return respostaErro("Produto não encontrado.", 404);
  }

  return NextResponse.json(atualizado);
}

export async function DELETE(request: Request) {
  return responderExclusao("produtos", request, "Produto");
}
