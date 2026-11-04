import { describe, expect, it } from "vitest";

import { montarOrcamento, VALIDADE_ORCAMENTO_DIAS } from "./orcamento";
import type { Cliente, Insumo, Pedido, Produto } from "./store";

const insumos: Insumo[] = [
  { id: "papel", nome: "Papel", unidade: "folha", quantidade_estoque: 100, quantidade_minima: 10, custo_unitario: 1 },
];
const produtos: Produto[] = [
  { id: "kit", nome: "Kit Clássico", margem_desejada: 0, tempo_producao_minutos: 0, insumos: [{ insumo_id: "papel", quantidade_por_unidade: 10 }] },
  { id: "topo", nome: "Topo de bolo", margem_desejada: 0, tempo_producao_minutos: 0, insumos: [{ insumo_id: "papel", quantidade_por_unidade: 5 }] },
];
const clientes: Cliente[] = [{ id: "ana", nome: "Ana Costa", contato: "(12) 90000-0000" }];
const configuracoes = { valor_hora_trabalho: 0, percentual_perdas: 0, percentual_custos_fixos: 0 };

const pedido = (itens: Pedido["itens"], valor_final: number): Pedido => ({
  id: "3c7c8746-7a17-4e04",
  cliente_id: "ana",
  itens,
  cores: "Azul",
  texto_personalizacao: "Feliz aniversário",
  data_entrega: "2026-11-20",
  status: "pendente",
  valor_final,
});

describe("montarOrcamento", () => {
  it("mantém o total do pedido e calcula o valor unitário", () => {
    const orcamento = montarOrcamento(pedido([{ produto_id: "kit", quantidade: 4 }], 40), { produtos, insumos, clientes, configuracoes });
    expect(orcamento.total).toBe(40);
    expect(orcamento.linhas).toEqual([{ produto: "Kit Clássico", quantidade: 4, valorUnitario: 10, subtotal: 40 }]);
    expect(orcamento.cliente?.nome).toBe("Ana Costa");
  });

  it("divide o total entre os produtos pelo preço de cada um", () => {
    const orcamento = montarOrcamento(
      pedido([{ produto_id: "kit", quantidade: 1 }, { produto_id: "topo", quantidade: 2 }], 30),
      { produtos, insumos, clientes, configuracoes },
    );
    expect(orcamento.linhas.map((linha) => linha.subtotal)).toEqual([15, 15]);
  });

  it("faz as linhas somarem exatamente o total, mesmo com arredondamento", () => {
    const orcamento = montarOrcamento(
      pedido([{ produto_id: "kit", quantidade: 1 }, { produto_id: "kit", quantidade: 1 }, { produto_id: "kit", quantidade: 1 }], 100),
      { produtos, insumos, clientes, configuracoes },
    );
    const soma = orcamento.linhas.reduce((total, linha) => total + linha.subtotal, 0);
    expect(Number(soma.toFixed(2))).toBe(100);
    expect(orcamento.linhas.map((linha) => linha.subtotal)).toEqual([33.33, 33.33, 33.34]);
  });

  it("define a validade a partir da data de emissão", () => {
    const orcamento = montarOrcamento(pedido([{ produto_id: "kit", quantidade: 1 }], 10), { produtos, insumos, clientes, configuracoes }, new Date(2026, 10, 4));
    expect(VALIDADE_ORCAMENTO_DIAS).toBe(7);
    expect(orcamento.emissao).toBe("2026-11-04");
    expect(orcamento.validade).toBe("2026-11-11");
    expect(orcamento.numero).toBe("ORC-3C7C87");
  });

  it("não quebra quando o produto ou o cliente foram removidos", () => {
    const orcamento = montarOrcamento(
      { ...pedido([{ produto_id: "sumiu", quantidade: 2 }], 50), cliente_id: "outro" },
      { produtos, insumos, clientes, configuracoes },
    );
    expect(orcamento.cliente).toBeNull();
    expect(orcamento.linhas).toEqual([{ produto: "Produto não encontrado", quantidade: 2, valorUnitario: 25, subtotal: 50 }]);
  });
});
