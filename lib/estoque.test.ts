import { describe, expect, it } from "vitest";

import {
  calcularReposicao,
  calcularStatusEstoque,
  formatarQuantidade,
  normalizarUnidade,
  sugerirReposicao,
} from "./estoque";

describe("calcularStatusEstoque", () => {
  it("marca como baixo quando a quantidade é igual ao mínimo", () => {
    expect(calcularStatusEstoque(10, 10)).toBe("baixo");
  });

  it("marca como critico quando a quantidade cai pela metade do mínimo", () => {
    expect(calcularStatusEstoque(5, 10)).toBe("critico");
  });

  it("marca como critico quando a quantidade é zero", () => {
    expect(calcularStatusEstoque(0, 10)).toBe("critico");
  });
});

describe("reposição", () => {
  it("não sugere compra quando o estoque está normal", () => {
    expect(calcularReposicao(30, 10)).toBe(0);
    expect(sugerirReposicao(30, 10, "folha")).toBe("Sem reposição");
  });

  it("sugere comprar até o dobro do mínimo quando o estoque está baixo", () => {
    expect(calcularReposicao(10, 10)).toBe(10);
    expect(calcularReposicao(0, 10)).toBe(20);
  });

  it("usa a unidade real do insumo na sugestão", () => {
    expect(sugerirReposicao(2, 5, "metro")).toBe("Comprar 8 metros");
    expect(sugerirReposicao(1000, 3000, "cm")).toBe("Comprar 5.000 cm");
    expect(sugerirReposicao(5, 3, "folha")).toBe("Sem reposição");
  });
});

describe("unidades", () => {
  it("aceita apenas as unidades de trabalho e seus apelidos, sem converter", () => {
    expect(normalizarUnidade("metro")).toBe("metro");
    expect(normalizarUnidade("m")).toBe("metro");
    expect(normalizarUnidade("cm")).toBe("cm");
    expect(normalizarUnidade("un")).toBe("unidade");
    expect(normalizarUnidade("litro")).toBeNull();
  });

  it("formata singular e plural", () => {
    expect(formatarQuantidade(1, "folha")).toBe("1 folha");
    expect(formatarQuantidade(2.5, "metro")).toBe("2,5 metros");
  });
});
