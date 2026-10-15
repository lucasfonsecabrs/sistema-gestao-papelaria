export const STATUS_ESTOQUE = ["normal", "baixo", "critico"] as const;

export type StatusEstoque = (typeof STATUS_ESTOQUE)[number];

// The unit chosen for an insumo is the same unit used in product composition
// and pricing. Nothing is converted between cm and metro.
export const UNIDADES = ["folha", "cm", "metro", "ml", "unidade", "kg"] as const;

export type Unidade = (typeof UNIDADES)[number];

export const ROTULO_UNIDADE: Record<Unidade, string> = {
  folha: "folha",
  cm: "centímetro (cm)",
  metro: "metro",
  ml: "mililitro (ml)",
  unidade: "unidade",
  kg: "quilo (kg)",
};

const PLURAL_UNIDADE: Record<Unidade, string> = {
  folha: "folhas",
  cm: "cm",
  metro: "metros",
  ml: "ml",
  unidade: "unidades",
  kg: "kg",
};

// Older records were saved with abbreviations; these are the same unit under
// another name, not a conversion.
const APELIDOS_UNIDADE: Record<string, Unidade> = {
  m: "metro",
  metros: "metro",
  un: "unidade",
  und: "unidade",
  unidades: "unidade",
  folhas: "folha",
};

export const CATEGORIAS_INSUMO = [
  "Papéis",
  "Acabamento",
  "Adesivos",
  "Fitas",
  "Aviamentos",
  "Estrutura",
  "Tecidos",
  "Tags",
  "Embalagem",
  "Impressão",
  "Outros",
] as const;

export interface InsumoEstoque {
  id: string;
  nome: string;
  unidade: string;
  quantidade_estoque: number;
  quantidade_minima: number;
  custo_unitario: number;
}

export function normalizarUnidade(unidade: unknown): Unidade | null {
  const valor = String(unidade ?? "").trim().toLowerCase();

  if ((UNIDADES as readonly string[]).includes(valor)) {
    return valor as Unidade;
  }

  return APELIDOS_UNIDADE[valor] ?? null;
}

export function formatarQuantidade(quantidade: number, unidade: string): string {
  const normalizada = normalizarUnidade(unidade);
  const numero = Number(quantidade.toFixed(3)).toLocaleString("pt-BR");

  if (!normalizada) {
    return `${numero} ${unidade}`;
  }

  return `${numero} ${quantidade === 1 ? normalizada : PLURAL_UNIDADE[normalizada]}`;
}

export function calcularStatusEstoque(
  quantidade: number,
  quantidadeMinima: number,
): StatusEstoque {
  if (quantidade <= 0) {
    return "critico";
  }

  if (quantidade <= quantidadeMinima / 2) {
    return "critico";
  }

  if (quantidade <= quantidadeMinima) {
    return "baixo";
  }

  return "normal";
}

// Restocking only below or at the minimum would leave the item flagged as
// "baixo" right after buying, so the target is twice the minimum.
export function calcularReposicao(quantidade: number, quantidadeMinima: number): number {
  if (calcularStatusEstoque(quantidade, quantidadeMinima) === "normal") {
    return 0;
  }

  const alvo = Math.max(quantidadeMinima * 2, 1);
  return Number(Math.max(alvo - Math.max(quantidade, 0), 0).toFixed(3));
}

export function sugerirReposicao(
  quantidade: number,
  quantidadeMinima: number,
  unidade = "unidade",
): string {
  const quantidadeFaltante = calcularReposicao(quantidade, quantidadeMinima);

  if (quantidadeFaltante === 0) {
    return "Sem reposição";
  }

  return `Comprar ${formatarQuantidade(quantidadeFaltante, unidade)}`;
}
