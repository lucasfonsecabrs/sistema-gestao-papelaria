import { describe, expect, it } from "vitest";

import {
  calcularUrgenciaPedido,
  descreverItens,
  itensIguais,
  dataIsoValida,
  formatarData,
  parseDataLocal,
  proximoStatus,
  STATUS_PEDIDO,
  type StatusPedido,
} from "./pedidos";
import {
  createInsumo,
  createPedido,
  createProduto,
  deleteInsumo,
  deletePedido,
  deleteProduto,
  insumos,
  insumosLixeira,
  pedidos,
  pedidosLixeira,
  produtos,
  produtosLixeira,
  restaurarInsumo,
  restaurarPedido,
  restaurarProduto,
  updateInsumo,
  updatePedido,
  updateProduto,
} from "./store";

describe("calcularUrgenciaPedido", () => {
  it("marca como atrasado quando a entrega já passou", () => {
    expect(calcularUrgenciaPedido(new Date("2026-09-24T00:00:00"), new Date("2026-09-25T00:00:00"))).toBe("atrasado");
  });

  it("marca entrega de hoje como urgente, não atrasada", () => {
    expect(calcularUrgenciaPedido(new Date("2026-09-25T00:00:00"), new Date("2026-09-25T15:00:00"))).toBe("urgente");
  });

  it("interpreta a data ISO como dia local, sem voltar um dia pelo fuso", () => {
    expect(calcularUrgenciaPedido("2026-09-25", new Date(2026, 8, 25, 22, 0))).toBe("urgente");
    expect(parseDataLocal("2026-09-26").getDate()).toBe(26);
    expect(formatarData("2026-09-26")).toBe("26/09/2026");
  });

  it("marca como urgente em 1 dia", () => {
    const entrega = new Date("2026-09-26T00:00:00");
    const hoje = new Date("2026-09-25T00:00:00");
    expect(calcularUrgenciaPedido(entrega, hoje)).toBe("urgente");
  });

  it("marca como proximo em 3 dias", () => {
    const entrega = new Date("2026-09-28T00:00:00");
    const hoje = new Date("2026-09-25T00:00:00");
    expect(calcularUrgenciaPedido(entrega, hoje)).toBe("proximo");
  });
});

describe("dataIsoValida", () => {
  it("aceita datas reais e recusa datas impossíveis", () => {
    expect(dataIsoValida("2026-02-28")).toBe(true);
    expect(dataIsoValida("2026-02-31")).toBe(false);
    expect(dataIsoValida("30/09/2026")).toBe(false);
  });
});

describe("proximoStatus", () => {
  it("indica o próximo status e nenhum após entregue", () => {
    expect(proximoStatus("pendente")).toBe("em_producao");
    expect(proximoStatus("entregue")).toBeNull();
  });

  it("reconhece o status final como válido sem avançar", () => {
    const estados: readonly StatusPedido[] = STATUS_PEDIDO;
    expect(estados.includes("entregue")).toBe(true);
  });
});

describe("updatePedido", () => {
  it("atualiza status, quantidade e texto de um pedido existente", () => {
    const pedido = createPedido({
      cliente_id: "cli-1",
      itens: [{ produto_id: "prod-1", quantidade: 3 }],
      cores: "Preto",
      texto_personalizacao: "Antigo",
      data_entrega: "2026-10-01",
      status: "pendente",
      valor_final: 90,
    });

    const atualizado = updatePedido(pedido.id, {
      status: "pronto",
      itens: [{ produto_id: "prod-1", quantidade: 12 }],
      texto_personalizacao: "Novo texto",
    });

    expect(atualizado?.status).toBe("pronto");
    expect(atualizado?.itens).toEqual([{ produto_id: "prod-1", quantidade: 12 }]);
    expect(atualizado?.texto_personalizacao).toBe("Novo texto");
    expect(pedidos.some((item) => item.id === pedido.id && item.status === "pronto")).toBe(true);
  });

  it("não apaga campos que não foram enviados na atualização parcial", () => {
    const pedido = createPedido({
      cliente_id: "cli-3",
      itens: [{ produto_id: "prod-1", quantidade: 4 }],
      cores: "Verde",
      texto_personalizacao: "Parcial",
      data_entrega: "2026-10-05",
      status: "pendente",
      valor_final: 40,
    });

    const atualizado = updatePedido(pedido.id, { status: "em_producao", cliente_id: undefined });

    expect(atualizado?.cliente_id).toBe("cli-3");
    expect(atualizado?.data_entrega).toBe("2026-10-05");
  });

  it("move o pedido excluído para a lixeira e permite restaurar", () => {
    const pedido = createPedido({
      cliente_id: "cli-2",
      itens: [{ produto_id: "prod-2", quantidade: 2 }],
      cores: "Rosa",
      texto_personalizacao: "Delete",
      data_entrega: "2026-10-03",
      status: "pendente",
      valor_final: 50,
    });

    const removido = deletePedido(pedido.id);

    expect(removido).toBe(true);
    expect(pedidos.some((item) => item.id === pedido.id)).toBe(false);
    expect(pedidosLixeira.some((item) => item.id === pedido.id)).toBe(true);

    expect(restaurarPedido(pedido.id)?.id).toBe(pedido.id);
    expect(pedidos.some((item) => item.id === pedido.id)).toBe(true);
    expect(pedidosLixeira.some((item) => item.id === pedido.id)).toBe(false);
  });
});

describe("produto management", () => {
  it("atualiza dados e insumos de um produto existente", () => {
    const produto = createProduto({
      nome: "Produto de teste",
      margem_desejada: 20,
      insumos: [{ insumo_id: "ins-1", quantidade_por_unidade: 1 }],
    });

    const atualizado = updateProduto(produto.id, {
      nome: "Produto editado",
      margem_desejada: 30,
      insumos: [{ insumo_id: "ins-2", quantidade_por_unidade: 2 }],
    });

    expect(atualizado?.nome).toBe("Produto editado");
    expect(atualizado?.margem_desejada).toBe(30);
    expect(atualizado?.insumos).toEqual([{ insumo_id: "ins-2", quantidade_por_unidade: 2 }]);
    expect(produtos.some((item) => item.id === produto.id && item.nome === "Produto editado")).toBe(true);
  });

  it("move o produto excluído para a lixeira e permite restaurar", () => {
    const produto = createProduto({
      nome: "Produto para remover",
      margem_desejada: 25,
      insumos: [{ insumo_id: "ins-3", quantidade_por_unidade: 5 }],
    });

    const removido = deleteProduto(produto.id);

    expect(removido).toBe(true);
    expect(produtos.some((item) => item.id === produto.id)).toBe(false);
    expect(produtosLixeira.some((item) => item.id === produto.id)).toBe(true);

    expect(restaurarProduto(produto.id)?.nome).toBe("Produto para remover");
    expect(produtos.some((item) => item.id === produto.id)).toBe(true);
  });
});

describe("insumo management", () => {
  it("atualiza custo e unidade de um insumo existente", () => {
    const insumo = createInsumo({
      nome: "Papel Teste",
      unidade: "folha",
      quantidade_estoque: 200,
      quantidade_minima: 50,
      custo_unitario: 0.12,
    });

    const atualizado = updateInsumo(insumo.id, {
      nome: "Papel Premium Teste",
      unidade: "folha",
      custo_unitario: 0.18,
    });

    expect(atualizado?.nome).toBe("Papel Premium Teste");
    expect(atualizado?.unidade).toBe("folha");
    expect(atualizado?.custo_unitario).toBe(0.18);
    expect(insumos.some((item) => item.id === insumo.id && item.custo_unitario === 0.18)).toBe(true);
  });

  it("remove um insumo do array principal", () => {
    const insumo = createInsumo({
      nome: "Fita para remover",
      unidade: "metro",
      quantidade_estoque: 50,
      quantidade_minima: 10,
      custo_unitario: 1.8,
    });

    const removido = deleteInsumo(insumo.id);

    expect(removido).toBe(true);
    expect(insumos.some((item) => item.id === insumo.id)).toBe(false);
    expect(insumosLixeira.some((item) => item.id === insumo.id)).toBe(true);

    const restaurado = restaurarInsumo(insumo.id);

    expect(restaurado?.nome).toBe("Fita para remover");
    expect(insumos.some((item) => item.id === insumo.id)).toBe(true);
  });
});

describe("calcularUrgenciaPedido nos limites exatos", () => {
  const hoje = new Date(2026, 8, 25, 12);
  const casos: [string, string][] = [
    ["2026-09-24", "atrasado"], // -1 dia
    ["2026-09-25", "urgente"], // 0 dias
    ["2026-09-26", "urgente"], // 1 dia
    ["2026-09-27", "proximo"], // 2 dias
    ["2026-09-28", "proximo"], // 3 dias
    ["2026-09-29", "tranquilo"], // 4 dias
  ];

  it.each(casos)("entrega em %s → %s", (data, esperado) => {
    expect(calcularUrgenciaPedido(data, hoje)).toBe(esperado);
  });
});

describe("itens do pedido", () => {
  const nome = (id: string) => (id === "p1" ? "Topo de bolo" : "Kit festa básico");

  it("descreve vários produtos com suas quantidades", () => {
    expect(
      descreverItens(
        [
          { produto_id: "p1", quantidade: 1 },
          { produto_id: "p2", quantidade: 2 },
        ],
        nome,
      ),
    ).toBe("1× Topo de bolo + 2× Kit festa básico");
  });

  it("compara itens sem depender da ordem", () => {
    const a = [
      { produto_id: "p1", quantidade: 1 },
      { produto_id: "p2", quantidade: 2 },
    ];
    expect(itensIguais(a, [...a].reverse())).toBe(true);
    expect(itensIguais(a, [{ produto_id: "p1", quantidade: 1 }])).toBe(false);
    expect(itensIguais(a, [{ produto_id: "p1", quantidade: 1 }, { produto_id: "p2", quantidade: 3 }])).toBe(false);
  });
});
