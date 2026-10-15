import { NextResponse } from "next/server";

import { excluir, listar, restaurar, type Tabela } from "./repositorio";

export type Payload = Record<string, unknown>;

export function respostaErro(mensagem: string, status = 400) {
  return NextResponse.json({ error: mensagem }, { status });
}

export async function lerPayload(request: Request): Promise<Payload | null> {
  try {
    const payload: unknown = await request.json();
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Payload)
      : null;
  } catch {
    return null;
  }
}

export function lerId(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

export async function responderListagem(tabela: Tabela, request: Request) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json(await listar(tabela, { lixeira: searchParams.get("lixeira") === "true" }));
}

export async function responderRestauracao(tabela: Tabela, id: string, rotulo: string) {
  const restaurado = id ? await restaurar(tabela, id) : undefined;

  if (!restaurado) {
    return respostaErro(`${rotulo} não encontrado na lixeira.`, 404);
  }

  return NextResponse.json(restaurado);
}

export async function responderExclusao(
  tabela: Tabela,
  request: Request,
  rotulo: string,
  corpoSucesso: Payload = { ok: true },
) {
  const id = new URL(request.url).searchParams.get("id")?.trim();

  if (!id) {
    return respostaErro(`ID do ${rotulo.toLowerCase()} obrigatório.`);
  }

  if (!(await excluir(tabela, id))) {
    return respostaErro(`${rotulo} não encontrado.`, 404);
  }

  return NextResponse.json(corpoSucesso);
}
