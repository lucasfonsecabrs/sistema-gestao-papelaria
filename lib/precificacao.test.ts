import { describe, expect, it } from "vitest";

import {
  calcularCustoProduto,
  calcularMargemReal,
  calcularPrecificacao,
  calcularPrecoSugerido,
  calcularValorPedido,
  CONFIGURACOES_PADRAO,
  calcularValorPedidoProduto,
  detalharProduto,
  type InsumoProduto,
} from "./precificacao";
import { insumos } from "./store";

describe("calcularCustoProduto", () => {
  it("soma o custo de múltiplos insumos", () => {
    const insumos: InsumoProduto[] = [
      { nome: "Papel", custoUnitario: 3, quantidadePorUnidade: 2 },
      { nome: "Tinta", custoUnitario: 1.5, quantidadePorUnidade: 3 },
    ];

    expect(calcularCustoProduto(insumos)).toBe(10.5);
  });

  it("retorna custo zero quando não há insumos", () => {
    expect(calcularCustoProduto([])).toBe(0);
  });
});

describe("calcularPrecoSugerido", () => {
  it("mantém o mesmo preço quando a margem é zero", () => {
    expect(calcularPrecoSugerido(25, 0)).toBe(25);
  });
});

describe("calcularMargemReal", () => {
  it("calcula a margem real com base em um preço praticado", () => {
    expect(calcularMargemReal(20, 30)).toBe(50);
  });
});

describe("calcularValorPedido", () => {
  it("calcula o valor total do pedido com base no custo unitário e na quantidade", () => {
    expect(calcularValorPedido(10, 50, 3)).toBe(45);
  });
});

describe("unidades de insumo", () => {
  it("usa medidas reais do atelier para precificação", () => {
    expect(insumos.map((insumo) => insumo.unidade)).toEqual(
      expect.arrayContaining(["folha", "cm", "ml"]),
    );
  });
});

describe("detalharProduto", () => {
  const papel = { id: "a", nome: "Papel", unidade: "folha", custo_unitario: 0.5 };
  const fita = { id: "b", nome: "Fita", unidade: "cm", custo_unitario: 0.01 };
  const produto = {
    margem_desejada: 100,
    insumos: [
      { insumo_id: "a", quantidade_por_unidade: 4 },
      { insumo_id: "b", quantidade_por_unidade: 50 },
    ],
  };

  it("calcula custo, preço e lucro usando a unidade do insumo sem conversão", () => {
    const detalhe = detalharProduto(produto, [papel, fita]);

    expect(detalhe.custo).toBe(2.5);
    expect(detalhe.precoSugerido).toBe(5);
    expect(detalhe.lucroUnitario).toBe(2.5);
    expect(detalhe.linhas.map((linha) => linha.unidade)).toEqual(["folha", "cm"]);
    expect(detalhe.insumosComProblema).toEqual([]);
  });

  it("recalcula imediatamente quando o custo de um insumo muda", () => {
    const detalhe = detalharProduto(produto, [{ ...papel, custo_unitario: 1 }, fita]);
    expect(detalhe.custo).toBe(4.5);
  });

  it("aponta insumos removidos e inexistentes sem somar custo", () => {
    const detalhe = detalharProduto(
      { margem_desejada: 0, insumos: [...produto.insumos, { insumo_id: "x", quantidade_por_unidade: 1 }] },
      [papel],
      [fita],
    );

    expect(detalhe.custo).toBe(2);
    expect(detalhe.insumosComProblema.map((linha) => linha.situacao)).toEqual(["removido", "inexistente"]);
    expect(detalhe.insumosComProblema[0].nome).toBe("Fita");
  });

  it("calcula o valor do pedido pela composição do produto", () => {
    expect(calcularValorPedidoProduto(produto, [papel, fita], 3)).toBe(15);
  });
});

describe("calcularPrecificacao (cascata)", () => {
  const config = { valor_hora_trabalho: 30, percentual_perdas: 10, percentual_custos_fixos: 20 };

  it("sem configuração e sem tempo, custo total = custo dos insumos", () => {
    const preco = calcularPrecificacao({ custoInsumos: 10, tempoProducaoMinutos: 0, margemDesejada: 50 });
    expect(preco).toEqual({
      custoInsumos: 10,
      custoMaoObra: 0,
      custoBase: 10,
      custoComPerdas: 10,
      custoTotal: 10,
      precoSugerido: 15,
    });
  });

  it("funciona com configuração zerada mesmo havendo tempo de produção", () => {
    const preco = calcularPrecificacao({
      custoInsumos: 10,
      tempoProducaoMinutos: 90,
      margemDesejada: 0,
      configuracoes: CONFIGURACOES_PADRAO,
    });
    expect(preco.custoMaoObra).toBe(0);
    expect(preco.precoSugerido).toBe(10);
  });

  it("mão de obra = (minutos / 60) × valor da hora", () => {
    const preco = calcularPrecificacao({ custoInsumos: 10, tempoProducaoMinutos: 30, margemDesejada: 0, configuracoes: { ...CONFIGURACOES_PADRAO, valor_hora_trabalho: 30 } });
    expect(preco.custoMaoObra).toBe(15);
    expect(preco.custoBase).toBe(25);
    expect(preco.custoTotal).toBe(25);
  });

  it("perdas aplicam sobre o custo base", () => {
    const preco = calcularPrecificacao({ custoInsumos: 10, tempoProducaoMinutos: 30, margemDesejada: 0, configuracoes: { ...config, percentual_custos_fixos: 0 } });
    expect(preco.custoComPerdas).toBe(27.5);
    expect(preco.custoTotal).toBe(27.5);
  });

  it("custos fixos aplicam sobre o custo com perdas", () => {
    const preco = calcularPrecificacao({ custoInsumos: 10, tempoProducaoMinutos: 30, margemDesejada: 0, configuracoes: config });
    expect(preco.custoTotal).toBe(33);
  });

  it("preço final aplica a margem sobre o custo total", () => {
    const preco = calcularPrecificacao({ custoInsumos: 10, tempoProducaoMinutos: 30, margemDesejada: 50, configuracoes: config });
    expect(preco.precoSugerido).toBe(49.5);
  });

  it("detalharProduto reflete a mudança de configuração", () => {
    const produto = { margem_desejada: 50, tempo_producao_minutos: 30, insumos: [{ insumo_id: "a", quantidade_por_unidade: 20 }] };
    const insumo = [{ id: "a", nome: "Papel", unidade: "folha", custo_unitario: 0.5 }];

    expect(detalharProduto(produto, insumo).precoSugerido).toBe(15);
    expect(detalharProduto(produto, insumo, [], config).precoSugerido).toBe(49.5);
    expect(calcularValorPedidoProduto(produto, insumo, 2, config)).toBe(99);
  });
});
