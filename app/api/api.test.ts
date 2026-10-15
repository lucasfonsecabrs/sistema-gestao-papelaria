import { describe, expect, it } from "vitest";

import * as clientesApi from "./clientes/route";
import * as configuracoesApi from "./configuracoes/route";
import * as insumosApi from "./insumos/route";
import * as pedidosApi from "./pedidos/route";
import * as produtosApi from "./produtos/route";

const URL_BASE = "http://localhost";

function requisicao(caminho: string, method: string, corpo?: unknown) {
  return new Request(`${URL_BASE}${caminho}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
}

async function json(response: Response) {
  return { status: response.status, corpo: await response.json() };
}

describe("API de clientes", () => {
  it("recusa JSON inválido e campos obrigatórios vazios", async () => {
    expect((await clientesApi.POST(requisicao("/api/clientes", "POST", "{"))).status).toBe(400);
    expect(await json(await clientesApi.POST(requisicao("/api/clientes", "POST", { nome: " ", contato: "1" })))).toEqual({
      status: 400,
      corpo: { error: "Nome do cliente é obrigatório." },
    });
  });

  it("avisa sobre duplicado e só grava após confirmação", async () => {
    const conflito = await json(
      await clientesApi.POST(requisicao("/api/clientes", "POST", { nome: "maria souza", contato: "000" })),
    );
    expect(conflito.status).toBe(409);
    expect(conflito.corpo.duplicado.id).toBe("cli-1");

    const confirmado = await clientesApi.POST(
      requisicao("/api/clientes", "POST", { nome: "maria souza", contato: "000", confirmarDuplicado: true }),
    );
    expect(confirmado.status).toBe(201);
  });

  it("exclui para a lixeira e restaura", async () => {
    const criado = (await json(await clientesApi.POST(requisicao("/api/clientes", "POST", { nome: "Temporário", contato: "5555-0000" })))).corpo;

    expect((await clientesApi.DELETE(requisicao(`/api/clientes?id=${criado.id}`, "DELETE"))).status).toBe(200);

    const lixeira = (await json(await clientesApi.GET(requisicao("/api/clientes?lixeira=true", "GET")))).corpo;
    expect(lixeira.some((cliente: { id: string }) => cliente.id === criado.id)).toBe(true);

    const restaurado = await json(
      await clientesApi.POST(requisicao("/api/clientes", "POST", { acao: "restaurar", id: criado.id })),
    );
    expect(restaurado).toEqual({ status: 200, corpo: criado });
  });
});

describe("API de insumos", () => {
  it("recusa valores negativos e unidade desconhecida", async () => {
    const negativo = await json(
      await insumosApi.POST(
        requisicao("/api/insumos", "POST", { nome: "X", unidade: "folha", quantidade_estoque: -1, quantidade_minima: 0, custo_unitario: 0 }),
      ),
    );
    expect(negativo).toEqual({ status: 400, corpo: { error: "Quantidade em estoque não pode ser negativo." } });

    const unidade = await insumosApi.POST(
      requisicao("/api/insumos", "POST", { nome: "X", unidade: "litro", quantidade_estoque: 1, quantidade_minima: 0, custo_unitario: 0 }),
    );
    expect(unidade.status).toBe(400);
  });

  it("edição parcial mantém os demais campos", async () => {
    const atualizado = await json(await insumosApi.PUT(requisicao("/api/insumos", "PUT", { id: "ins-3", custo_unitario: 0.09 })));
    expect(atualizado.status).toBe(200);
    expect(atualizado.corpo).toMatchObject({ nome: "Tinta Acrílica", unidade: "ml", custo_unitario: 0.09 });
  });

  it("responde 404 para id inexistente", async () => {
    expect((await insumosApi.PUT(requisicao("/api/insumos", "PUT", { id: "nao-existe", nome: "X" }))).status).toBe(404);
    expect((await insumosApi.DELETE(requisicao("/api/insumos?id=nao-existe", "DELETE"))).status).toBe(404);
  });
});

describe("API de produtos", () => {
  it("recusa insumo que não existe", async () => {
    const resposta = await produtosApi.POST(
      requisicao("/api/produtos", "POST", { nome: "Kit", margem_desejada: 10, insumos: [{ insumo_id: "fantasma", quantidade_por_unidade: 1 }] }),
    );
    expect(resposta.status).toBe(400);
  });
});

describe("API de pedidos", () => {
  const novoPedido = {
    cliente_id: "cli-2",
    produto_id: "prod-2",
    cores: "Rosa",
    texto_personalizacao: "",
    quantidade: 2,
    data_entrega: "2026-10-20",
    valor_final: 1,
  };

  it("calcula o valor no servidor, ignorando o valor enviado", async () => {
    const criado = await json(await pedidosApi.POST(requisicao("/api/pedidos", "POST", novoPedido)));

    // prod-2: 6 folhas x 0,18 + 30 cm x 0,014 = 1,50; +35% = 2,03; x2 = 4,06
    expect(criado.status).toBe(201);
    expect(criado.corpo.valor_final).toBe(4.06);
    expect(criado.corpo.status).toBe("pendente");
  });

  it("recusa ids inexistentes e pular etapas de status", async () => {
    expect((await pedidosApi.POST(requisicao("/api/pedidos", "POST", { ...novoPedido, cliente_id: "x" }))).status).toBe(400);

    const criado = (await json(await pedidosApi.POST(requisicao("/api/pedidos", "POST", novoPedido)))).corpo;
    const pulo = await pedidosApi.PUT(requisicao("/api/pedidos", "PUT", { id: criado.id, status: "entregue" }));
    expect(pulo.status).toBe(400);

    const avanco = await json(await pedidosApi.PUT(requisicao("/api/pedidos", "PUT", { id: criado.id, status: "em_producao" })));
    expect(avanco.corpo).toMatchObject({ status: "em_producao", cliente_id: "cli-2", data_entrega: "2026-10-20" });
  });

  it("mantém o valor combinado quando só o status muda e recalcula quando a quantidade muda", async () => {
    const criado = (await json(await pedidosApi.POST(requisicao("/api/pedidos", "POST", novoPedido)))).corpo;

    await insumosApi.PUT(requisicao("/api/insumos", "PUT", { id: "ins-1", custo_unitario: 1 }));

    const status = (await json(await pedidosApi.PUT(requisicao("/api/pedidos", "PUT", { id: criado.id, status: "em_producao" })))).corpo;
    expect(status.valor_final).toBe(criado.valor_final);

    const quantidade = (await json(await pedidosApi.PUT(requisicao("/api/pedidos", "PUT", { id: criado.id, quantidade: 3 })))).corpo;
    expect(quantidade.valor_final).toBeGreaterThan(criado.valor_final);
  });

  it("exclui para a lixeira e restaura", async () => {
    const criado = (await json(await pedidosApi.POST(requisicao("/api/pedidos", "POST", novoPedido)))).corpo;

    expect(await json(await pedidosApi.DELETE(requisicao(`/api/pedidos?id=${criado.id}`, "DELETE")))).toEqual({
      status: 200,
      corpo: { success: true },
    });

    const ativos = (await json(await pedidosApi.GET(requisicao("/api/pedidos", "GET")))).corpo;
    expect(ativos.some((pedido: { id: string }) => pedido.id === criado.id)).toBe(false);

    const restaurado = await pedidosApi.POST(requisicao("/api/pedidos", "POST", { acao: "restaurar", id: criado.id }));
    expect(restaurado.status).toBe(200);
  });
});

describe("API de configurações", () => {
  it("começa zerada, salva e recupera os três parâmetros", async () => {
    expect(await json(await configuracoesApi.GET(requisicao("/api/configuracoes", "GET")))).toEqual({
      status: 200,
      corpo: { valor_hora_trabalho: 0, percentual_perdas: 0, percentual_custos_fixos: 0 },
    });

    const salvo = await json(
      await configuracoesApi.PUT(
        requisicao("/api/configuracoes", "PUT", { valor_hora_trabalho: 30, percentual_perdas: 10, percentual_custos_fixos: 20 }),
      ),
    );
    expect(salvo.status).toBe(200);

    const lido = (await json(await configuracoesApi.GET(requisicao("/api/configuracoes", "GET")))).corpo;
    expect(lido).toEqual({ valor_hora_trabalho: 30, percentual_perdas: 10, percentual_custos_fixos: 20 });
  });

  it("recusa valores negativos", async () => {
    const resposta = await configuracoesApi.PUT(requisicao("/api/configuracoes", "PUT", { percentual_perdas: -1 }));
    expect(resposta.status).toBe(400);
  });

  it("o valor de um novo pedido reflete a mudança nas configurações", async () => {
    const produto = (
      await json(
        await produtosApi.POST(
          requisicao("/api/produtos", "POST", {
            nome: "Topo de bolo",
            margem_desejada: 50,
            tempo_producao_minutos: 30,
            insumos: [{ insumo_id: "ins-4", quantidade_por_unidade: 10 }],
          }),
        ),
      )
    ).corpo;
    expect(produto.tempo_producao_minutos).toBe(30);

    const pedido = { cliente_id: "cli-1", produto_id: produto.id, quantidade: 1, data_entrega: "2026-10-30" };

    await configuracoesApi.PUT(requisicao("/api/configuracoes", "PUT", { valor_hora_trabalho: 0, percentual_perdas: 0, percentual_custos_fixos: 0 }));
    const semConfig = (await json(await pedidosApi.POST(requisicao("/api/pedidos", "POST", pedido)))).corpo;
    // 10 folhas × R$ 0,35 = R$ 3,50; +50% = R$ 5,25
    expect(semConfig.valor_final).toBe(5.25);

    await configuracoesApi.PUT(requisicao("/api/configuracoes", "PUT", { valor_hora_trabalho: 30, percentual_perdas: 10, percentual_custos_fixos: 20 }));
    const comConfig = (await json(await pedidosApi.POST(requisicao("/api/pedidos", "POST", pedido)))).corpo;
    // (3,50 + 15,00) × 1,10 × 1,20 = 24,42; +50% = 36,63
    expect(comConfig.valor_final).toBe(36.63);
  });
});
