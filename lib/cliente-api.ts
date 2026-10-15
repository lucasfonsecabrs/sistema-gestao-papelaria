export type RespostaApi<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: string; status: number; corpo: Record<string, unknown> };

export async function chamarApi<T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  corpo?: unknown,
): Promise<RespostaApi<T>> {
  try {
    const response = await fetch(url, {
      method,
      cache: "no-store",
      headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const dados = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        erro:
          typeof dados?.error === "string" ? dados.error : "Não foi possível concluir. Tente novamente.",
        status: response.status,
        corpo: dados ?? {},
      };
    }

    return { ok: true, dados: dados as T };
  } catch {
    return {
      ok: false,
      erro: "Sem conexão com o sistema. Verifique a internet e tente novamente.",
      status: 0,
      corpo: {},
    };
  }
}
