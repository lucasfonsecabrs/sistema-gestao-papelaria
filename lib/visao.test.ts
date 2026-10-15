import { describe, expect, it } from "vitest";

import type { Cliente, Insumo, Pedido } from "./store";
import {
  FILTROS_ESTOQUE_PADRAO,
  FILTROS_PEDIDO_PADRAO,
  detalharProdutos,
  filtrarInsumos,
  filtrarPedidos,
  resumirClientes,
  resumirPainel,
  situacaoInsumos,
  urgenciaDoPedido,
} from "./visao";

const hoje = new Date(2026, 8, 25, 10);

function pedido(parcial: Partial<Pedido>): Pedido {
  return {
    id: crypto.randomUUID(),
    cliente_id: "c1",
    produto_id: "p1",
    cores: "",
    texto_personalizacao: "",
    quantidade: 1,
    data_entrega: "2026-10-10",
    status: "pendente",
    valor_final: 10,
    ...parcial,
  };
}

const nomes = {
  cliente: (id: string) => (id === "c1" ? "Maria Souza" : "João"),
  produto: (id: string) => (id === "p1" ? "Caneca" : "Agenda"),
};

describe("filtrarPedidos", () => {
  const lista = [
    pedido({ id: "a", data_entrega: "2026-10-05", cores: "Azul" }),
    pedido({ id: "b", data_entrega: "2026-09-20", cliente_id: "c2", produto_id: "p2" }),
    pedido({ id: "c", data_entrega: "2026-09-26", status: "entregue" }),
  ];

  it("mostra só os abertos por padrão, ordenados pela entrega", () => {
    expect(filtrarPedidos(lista, FILTROS_PEDIDO_PADRAO, nomes, hoje).map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("busca por cliente ou produto sem diferenciar acentos", () => {
    const filtros = { ...FILTROS_PEDIDO_PADRAO, status: "todos" as const, busca: "joao" };
    expect(filtrarPedidos(lista, filtros, nomes, hoje).map((p) => p.id)).toEqual(["b"]);
    expect(filtrarPedidos(lista, { ...filtros, busca: "caneca" }, nomes, hoje).map((p) => p.id)).toEqual(["c", "a"]);
  });

  it("filtra por status, período e cliente, e inverte a ordem", () => {
    const base = { ...FILTROS_PEDIDO_PADRAO, status: "todos" as const };
    expect(filtrarPedidos(lista, { ...base, status: "entregue" }, nomes, hoje).map((p) => p.id)).toEqual(["c"]);
    expect(filtrarPedidos(lista, { ...base, de: "2026-09-21", ate: "2026-09-30" }, nomes, hoje).map((p) => p.id)).toEqual(["c"]);
    expect(filtrarPedidos(lista, { ...base, clienteId: "c2" }, nomes, hoje).map((p) => p.id)).toEqual(["b"]);
    expect(filtrarPedidos(lista, { ...base, ordem: "entrega_desc" }, nomes, hoje).map((p) => p.id)).toEqual(["a", "c", "b"]);
  });

  it("filtra só os que exigem atenção", () => {
    const filtros = { ...FILTROS_PEDIDO_PADRAO, somenteAtencao: true };
    expect(filtrarPedidos(lista, filtros, nomes, hoje).map((p) => p.id)).toEqual(["b"]);
  });
});

describe("urgenciaDoPedido", () => {
  it("não marca pedido entregue como atrasado", () => {
    expect(urgenciaDoPedido(pedido({ data_entrega: "2026-09-01", status: "entregue" }), hoje)).toBe("tranquilo");
    expect(urgenciaDoPedido(pedido({ data_entrega: "2026-09-01" }), hoje)).toBe("atrasado");
  });
});

describe("estoque", () => {
  const insumos: Insumo[] = [
    { id: "1", nome: "Papel Kraft", categoria: "Papéis", unidade: "folha", quantidade_estoque: 5, quantidade_minima: 20, custo_unitario: 1 },
    { id: "2", nome: "Fita", categoria: "Fitas", unidade: "metro", quantidade_estoque: 15, quantidade_minima: 20, custo_unitario: 1 },
    { id: "3", nome: "Cola", categoria: "Adesivos", unidade: "ml", quantidade_estoque: 500, quantidade_minima: 20, custo_unitario: 1 },
  ];
  const comSituacao = situacaoInsumos(insumos);

  it("calcula situação e reposição", () => {
    expect(comSituacao.map((i) => [i.situacao, i.reposicao])).toEqual([
      ["critico", 35],
      ["baixo", 25],
      ["normal", 0],
    ]);
  });

  it("filtra por categoria, situação e busca", () => {
    expect(filtrarInsumos(comSituacao, { ...FILTROS_ESTOQUE_PADRAO, situacao: "alerta" }).map((i) => i.id)).toEqual(["1", "2"]);
    expect(filtrarInsumos(comSituacao, { ...FILTROS_ESTOQUE_PADRAO, categoria: "Fitas" }).map((i) => i.id)).toEqual(["2"]);
    expect(filtrarInsumos(comSituacao, { ...FILTROS_ESTOQUE_PADRAO, busca: "kraft" }).map((i) => i.id)).toEqual(["1"]);
  });
});

describe("resumirClientes", () => {
  it("conta pedidos e encontra o último pela entrega", () => {
    const clientes: Cliente[] = [
      { id: "c1", nome: "Maria", contato: "1" },
      { id: "c3", nome: "Sem pedidos", contato: "2" },
    ];
    const resumo = resumirClientes(clientes, [
      pedido({ id: "x", data_entrega: "2026-10-01" }),
      pedido({ id: "y", data_entrega: "2026-11-01", status: "entregue" }),
    ]);

    expect(resumo[0]).toMatchObject({ totalPedidos: 2, pedidosAbertos: 1, ultimoPedido: { id: "y" } });
    expect(resumo[1]).toMatchObject({ totalPedidos: 0, ultimoPedido: undefined });
  });
});

describe("resumirPainel", () => {
  it("resume abertos, atenção, faturamento, margem e alertas", () => {
    const insumos = situacaoInsumos([
      { id: "i1", nome: "Papel", unidade: "folha", quantidade_estoque: 1, quantidade_minima: 10, custo_unitario: 1 },
    ]);
    const produtos = detalharProdutos(
      [
        { id: "p1", nome: "A", margem_desejada: 40, tempo_producao_minutos: 0, insumos: [{ insumo_id: "i1", quantidade_por_unidade: 1 }] },
        { id: "p2", nome: "B", margem_desejada: 20, tempo_producao_minutos: 0, insumos: [{ insumo_id: "sumiu", quantidade_por_unidade: 1 }] },
      ],
      insumos,
      [],
    );
    const resumo = resumirPainel(
      [
        pedido({ data_entrega: "2026-09-20", valor_final: 50 }),
        pedido({ data_entrega: "2026-09-26", valor_final: 30 }),
        pedido({ data_entrega: "2026-12-01", valor_final: 20 }),
        pedido({ data_entrega: "2026-09-01", valor_final: 999, status: "entregue" }),
      ],
      produtos,
      insumos,
      hoje,
    );

    expect(resumo.abertos).toHaveLength(3);
    expect(resumo.atencao).toHaveLength(2);
    expect(resumo.atrasados).toBe(1);
    expect(resumo.faturamentoAberto).toBe(100);
    expect(resumo.margemMedia).toBe(30);
    expect(resumo.criticos).toBe(1);
    expect(resumo.produtosComProblema.map((p) => p.id)).toEqual(["p2"]);
  });
});
