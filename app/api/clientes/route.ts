import { NextResponse } from "next/server";

import { atualizar, criar, listar, obter } from "@/lib/repositorio";
import {
  lerId,
  lerPayload,
  respostaErro,
  responderExclusao,
  responderListagem,
  responderRestauracao,
  type Payload,
} from "@/lib/rotas";
import { encontrarClienteDuplicado, validarCliente, type DadosCliente } from "@/lib/validacao";

export async function GET(request: Request) {
  return responderListagem("clientes", request);
}

// Obvious duplicates (same name or same contact) are only saved after the
// caller confirms with `confirmarDuplicado: true`.
async function verificarDuplicado(payload: Payload, dados: DadosCliente, ignorarId?: string) {
  if (payload.confirmarDuplicado === true) {
    return null;
  }

  const duplicado = encontrarClienteDuplicado(await listar("clientes"), dados, ignorarId);

  if (!duplicado) {
    return null;
  }

  return NextResponse.json(
    {
      error: `Já existe um cliente parecido: ${duplicado.nome} (${duplicado.contato}).`,
      duplicado,
    },
    { status: 409 },
  );
}

export async function POST(request: Request) {
  const payload = await lerPayload(request);

  if (!payload) {
    return respostaErro("Dados inválidos.");
  }

  if (payload.acao === "restaurar") {
    return responderRestauracao("clientes", lerId(payload.id), "Cliente");
  }

  const resultado = validarCliente(payload);

  if (!resultado.ok) {
    return respostaErro(resultado.erro);
  }

  const conflito = await verificarDuplicado(payload, resultado.dados);

  if (conflito) {
    return conflito;
  }

  return NextResponse.json(await criar("clientes", resultado.dados), { status: 201 });
}

export async function PUT(request: Request) {
  const payload = await lerPayload(request);
  const id = lerId(payload?.id);

  if (!payload || !id) {
    return respostaErro("ID do cliente obrigatório.");
  }

  const atual = await obter("clientes", id);

  if (!atual) {
    return respostaErro("Cliente não encontrado.", 404);
  }

  const resultado = validarCliente(payload, atual);

  if (!resultado.ok) {
    return respostaErro(resultado.erro);
  }

  const conflito = await verificarDuplicado(payload, resultado.dados, id);

  if (conflito) {
    return conflito;
  }

  const atualizado = await atualizar("clientes", id, resultado.dados);

  if (!atualizado) {
    return respostaErro("Cliente não encontrado.", 404);
  }

  return NextResponse.json(atualizado);
}

export async function DELETE(request: Request) {
  return responderExclusao("clientes", request, "Cliente");
}
