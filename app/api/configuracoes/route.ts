import { NextResponse } from "next/server";

import { obterConfiguracoes, salvarConfiguracoes } from "@/lib/repositorio";
import { lerPayload, respostaErro } from "@/lib/rotas";
import { validarConfiguracoes } from "@/lib/validacao";

export async function GET(request: Request) {
  // Reading the request keeps this handler dynamic: settings change at runtime.
  void request.url;
  return NextResponse.json(await obterConfiguracoes());
}

export async function PUT(request: Request) {
  const payload = await lerPayload(request);

  if (!payload) {
    return respostaErro("Dados inválidos.");
  }

  const resultado = validarConfiguracoes(payload, await obterConfiguracoes());

  if (!resultado.ok) {
    return respostaErro(resultado.erro);
  }

  return NextResponse.json(await salvarConfiguracoes(resultado.dados));
}
