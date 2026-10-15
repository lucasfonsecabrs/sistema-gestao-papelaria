import { NextResponse } from "next/server";

import { atualizar, criar, obter } from "@/lib/repositorio";
import {
  lerId,
  lerPayload,
  respostaErro,
  responderExclusao,
  responderListagem,
  responderRestauracao,
} from "@/lib/rotas";
import { validarInsumo } from "@/lib/validacao";

export async function GET(request: Request) {
  return responderListagem("insumos", request);
}

export async function POST(request: Request) {
  const payload = await lerPayload(request);

  if (!payload) {
    return respostaErro("Dados inválidos.");
  }

  if (payload.acao === "restaurar") {
    return responderRestauracao("insumos", lerId(payload.id), "Insumo");
  }

  const resultado = validarInsumo(payload);

  if (!resultado.ok) {
    return respostaErro(resultado.erro);
  }

  return NextResponse.json(await criar("insumos", resultado.dados), { status: 201 });
}

export async function PUT(request: Request) {
  const payload = await lerPayload(request);
  const id = lerId(payload?.id);

  if (!payload || !id) {
    return respostaErro("ID do insumo obrigatório.");
  }

  const atual = await obter("insumos", id);

  if (!atual) {
    return respostaErro("Insumo não encontrado.", 404);
  }

  const resultado = validarInsumo(payload, atual);

  if (!resultado.ok) {
    return respostaErro(resultado.erro);
  }

  const atualizado = await atualizar("insumos", id, resultado.dados);

  if (!atualizado) {
    return respostaErro("Insumo não encontrado.", 404);
  }

  return NextResponse.json(atualizado);
}

export async function DELETE(request: Request) {
  return responderExclusao("insumos", request, "Insumo");
}
