import { describe, expect, it } from "vitest";

import {
  encontrarClienteDuplicado,
  normalizarTexto,
  validarCliente,
  validarConfiguracoes,
  validarInsumo,
  validarPedido,
  validarProduto,
  type DadosPedido,
} from "./validacao";

describe("validarCliente", () => {
  it("exige nome e contato e remove espaços", () => {
    expect(validarCliente({ nome: "  Ana ", contato: " 1499 " })).toEqual({
      ok: true,
      dados: { nome: "Ana", contato: "1499" },
    });
    expect(validarCliente({ nome: "", contato: "1499" })).toEqual({
      ok: false,
      erro: "Nome do cliente é obrigatório.",
    });
    expect(validarCliente({ nome: "Ana" }).ok).toBe(false);
  });

  it("mantém os dados atuais em atualização parcial", () => {
    const resultado = validarCliente({ contato: "novo" }, { nome: "Ana", contato: "antigo" });
    expect(resultado).toEqual({ ok: true, dados: { nome: "Ana", contato: "novo" } });
  });
});

describe("encontrarClienteDuplicado", () => {
  const clientes = [{ id: "1", nome: "Maria Souza", contato: "(14) 99888-1001" }];

  it("detecta o mesmo nome ignorando acentos, caixa e espaços", () => {
    expect(encontrarClienteDuplicado(clientes, { nome: "  maria  SOUZA", contato: "x" })?.id).toBe("1");
    expect(normalizarTexto("João  Árvore")).toBe("joao arvore");
  });

  it("detecta o mesmo telefone com formatação diferente", () => {
    expect(encontrarClienteDuplicado(clientes, { nome: "Outra", contato: "14998881001" })?.id).toBe("1");
  });

  it("ignora o próprio cliente ao editar", () => {
    expect(encontrarClienteDuplicado(clientes, clientes[0], "1")).toBeUndefined();
  });
});

describe("validarInsumo", () => {
  const base = {
    nome: "Papel",
    categoria: "Papéis",
    unidade: "folha",
    quantidade_estoque: 10,
    quantidade_minima: 2,
    custo_unitario: 0.5,
  };

  it("aceita um insumo válido", () => {
    expect(validarInsumo(base)).toEqual({ ok: true, dados: base });
  });

  it("recusa números negativos e não numéricos", () => {
    expect(validarInsumo({ ...base, custo_unitario: -1 })).toEqual({
      ok: false,
      erro: "Custo por unidade não pode ser negativo.",
    });
    expect(validarInsumo({ ...base, quantidade_estoque: "abc" }).ok).toBe(false);
    expect(validarInsumo({ ...base, quantidade_minima: null }).ok).toBe(false);
  });

  it("recusa unidades fora das unidades de trabalho", () => {
    expect(validarInsumo({ ...base, unidade: "litro" }).ok).toBe(false);
  });

  it("guarda o apelido m como metro, sem converter a quantidade", () => {
    const resultado = validarInsumo({ ...base, unidade: "m", quantidade_estoque: 3 });
    expect(resultado.ok && resultado.dados.unidade).toBe("metro");
    expect(resultado.ok && resultado.dados.quantidade_estoque).toBe(3);
  });
});

describe("validarProduto", () => {
  const ativos = new Set(["ins-1", "ins-2"]);

  it("aceita composição com insumos existentes na ordem enviada", () => {
    const resultado = validarProduto(
      {
        nome: "Kit",
        margem_desejada: 40,
        insumos: [
          { insumo_id: "ins-2", quantidade_por_unidade: 3 },
          { insumo_id: "ins-1", quantidade_por_unidade: "1.5" },
        ],
      },
      ativos,
    );

    expect(resultado.ok && resultado.dados.insumos).toEqual([
      { insumo_id: "ins-2", quantidade_por_unidade: 3 },
      { insumo_id: "ins-1", quantidade_por_unidade: 1.5 },
    ]);
  });

  it("recusa insumo inexistente ou na lixeira", () => {
    const resultado = validarProduto(
      { nome: "Kit", margem_desejada: 10, insumos: [{ insumo_id: "ins-9", quantidade_por_unidade: 1 }] },
      ativos,
    );
    expect(resultado).toEqual({
      ok: false,
      erro: "O insumo da linha 1 não existe no estoque ou está na lixeira.",
    });
  });

  it("guarda o tempo de produção, usando 0 quando não informado", () => {
    const sem = validarProduto({ nome: "Kit", margem_desejada: 10, insumos: [] }, ativos);
    const com = validarProduto({ nome: "Kit", margem_desejada: 10, tempo_producao_minutos: "45", insumos: [] }, ativos);
    expect(sem.ok && sem.dados.tempo_producao_minutos).toBe(0);
    expect(com.ok && com.dados.tempo_producao_minutos).toBe(45);
    expect(validarProduto({ nome: "Kit", margem_desejada: 10, tempo_producao_minutos: -1, insumos: [] }, ativos).ok).toBe(false);
  });

  it("recusa o mesmo insumo em duas linhas", () => {
    const resultado = validarProduto(
      {
        nome: "Kit",
        margem_desejada: 10,
        insumos: [
          { insumo_id: "ins-1", quantidade_por_unidade: 1 },
          { insumo_id: "ins-1", quantidade_por_unidade: 2 },
        ],
      },
      ativos,
    );
    expect(resultado.ok).toBe(false);
  });

  it("recusa quantidade zero e margem negativa", () => {
    expect(
      validarProduto({ nome: "Kit", margem_desejada: 10, insumos: [{ insumo_id: "ins-1", quantidade_por_unidade: 0 }] }, ativos).ok,
    ).toBe(false);
    expect(validarProduto({ nome: "Kit", margem_desejada: -5, insumos: [] }, ativos).ok).toBe(false);
  });
});

describe("validarPedido", () => {
  const vinculos = { clientes: new Set(["cli-1"]), produtos: new Set(["prod-1", "prod-2"]) };
  const base = {
    cliente_id: "cli-1",
    itens: [{ produto_id: "prod-1", quantidade: 2 }],
    data_entrega: "2026-10-10",
  };

  it("cria como pendente por padrão", () => {
    const resultado = validarPedido(base, vinculos);
    expect(resultado.ok && resultado.dados.status).toBe("pendente");
  });

  it("recusa cliente ou produto inexistente", () => {
    expect(validarPedido({ ...base, cliente_id: "x" }, vinculos)).toEqual({ ok: false, erro: "Cliente não encontrado." });
    expect(validarPedido({ ...base, itens: [{ produto_id: "x", quantidade: 1 }] }, vinculos)).toEqual({
      ok: false,
      erro: "O produto da linha 1 não foi encontrado.",
    });
  });

  it("aceita vários produtos e recusa pedido vazio ou produto repetido", () => {
    const varios = validarPedido(
      { ...base, itens: [{ produto_id: "prod-1", quantidade: 1 }, { produto_id: "prod-2", quantidade: 1 }] },
      vinculos,
    );
    expect(varios.ok && varios.dados.itens).toHaveLength(2);
    expect(validarPedido({ ...base, itens: [] }, vinculos)).toEqual({ ok: false, erro: "Adicione pelo menos um produto ao pedido." });
    expect(
      validarPedido({ ...base, itens: [{ produto_id: "prod-1", quantidade: 1 }, { produto_id: "prod-1", quantidade: 2 }] }, vinculos).ok,
    ).toBe(false);
  });

  it("recusa quantidade inválida, data inválida e status desconhecido", () => {
    expect(validarPedido({ ...base, itens: [{ produto_id: "prod-1", quantidade: 0 }] }, vinculos).ok).toBe(false);
    expect(validarPedido({ ...base, itens: [{ produto_id: "prod-1", quantidade: 1.5 }] }, vinculos).ok).toBe(false);
    expect(validarPedido({ ...base, data_entrega: "2026-13-01" }, vinculos).ok).toBe(false);
    expect(validarPedido({ ...base, status: "cancelado" }, vinculos).ok).toBe(false);
  });

  const atual: DadosPedido = {
    ...base,
    cores: "Azul",
    texto_personalizacao: "Oi",
    status: "pendente",
  };

  it("permite mudar a situação para qualquer etapa, inclusive voltar", () => {
    expect(validarPedido({ status: "em_producao" }, vinculos, atual).ok).toBe(true);
    expect(validarPedido({ status: "entregue" }, vinculos, atual).ok).toBe(true);
    expect(validarPedido({ status: "pendente" }, vinculos, { ...atual, status: "pronto" }).ok).toBe(true);
    expect(validarPedido({ status: "cancelado" }, vinculos, atual).ok).toBe(false);
  });

  it("permite editar pedido cujo cliente foi para a lixeira sem trocar o cliente", () => {
    const resultado = validarPedido(
      { itens: [{ produto_id: "prod-1", quantidade: 5 }] },
      { clientes: new Set(), produtos: vinculos.produtos },
      atual,
    );
    expect(resultado.ok && resultado.dados.itens).toEqual([{ produto_id: "prod-1", quantidade: 5 }]);
  });
});

describe("validarConfiguracoes", () => {
  it("usa 0 para campos ausentes e recusa negativos", () => {
    expect(validarConfiguracoes({})).toEqual({
      ok: true,
      dados: { valor_hora_trabalho: 0, percentual_perdas: 0, percentual_custos_fixos: 0 },
    });
    expect(validarConfiguracoes({ valor_hora_trabalho: -5 }).ok).toBe(false);
    expect(validarConfiguracoes({ percentual_perdas: "abc" }).ok).toBe(false);
  });

  it("mantém os valores atuais em atualização parcial", () => {
    const atual = { valor_hora_trabalho: 25, percentual_perdas: 5, percentual_custos_fixos: 8 };
    expect(validarConfiguracoes({ percentual_perdas: 10 }, atual)).toEqual({
      ok: true,
      dados: { ...atual, percentual_perdas: 10 },
    });
  });
});
