export const STATUS_PEDIDO = [
  "pendente",
  "em_producao",
  "pronto",
  "entregue",
] as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[number];
export type UrgenciaPedido = "atrasado" | "urgente" | "proximo" | "tranquilo";

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  pendente: "Pendente",
  em_producao: "Em produção",
  pronto: "Pronto",
  entregue: "Entregue",
};

const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

// `new Date("2026-09-26")` is parsed as UTC midnight, which in Brazil (UTC-3)
// falls on the previous day. Delivery dates are calendar days, so parse them
// as local dates.
export function parseDataLocal(data: string | Date): Date {
  if (data instanceof Date) {
    return new Date(data);
  }

  const match = DATA_ISO.exec(data);

  if (!match) {
    return new Date(data);
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function dataIsoValida(data: string): boolean {
  const match = DATA_ISO.exec(data);

  if (!match) {
    return false;
  }

  const parsed = parseDataLocal(data);
  return (
    parsed.getFullYear() === Number(match[1]) &&
    parsed.getMonth() === Number(match[2]) - 1 &&
    parsed.getDate() === Number(match[3])
  );
}

export function paraDataIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function adicionarDias(data: Date, dias: number): Date {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

export function formatarData(data: string): string {
  return parseDataLocal(data).toLocaleDateString("pt-BR");
}

export function calcularUrgenciaPedido(
  dataEntrega: Date | string,
  hoje: Date = new Date(),
): UrgenciaPedido {
  const entrega = parseDataLocal(dataEntrega);
  const dataHoje = new Date(hoje);

  entrega.setHours(0, 0, 0, 0);
  dataHoje.setHours(0, 0, 0, 0);

  const diferencaDias = Math.round(
    (entrega.getTime() - dataHoje.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Delivering today is urgent, not late: only past dates are "atrasado".
  if (diferencaDias < 0) {
    return "atrasado";
  }

  if (diferencaDias <= 1) {
    return "urgente";
  }

  if (diferencaDias <= 3) {
    return "proximo";
  }

  return "tranquilo";
}

export function proximoStatus(statusAtual: StatusPedido): StatusPedido | null {
  const indice = STATUS_PEDIDO.indexOf(statusAtual);
  return STATUS_PEDIDO[indice + 1] ?? null;
}

export function statusValido(status: unknown): status is StatusPedido {
  return STATUS_PEDIDO.includes(status as StatusPedido);
}

export type ItemPedido = {
  produto_id: string;
  quantidade: number;
};

// Ex.: "1× Topo de bolo + 2× Kit festa básico".
export function descreverItens(itens: readonly ItemPedido[], nomeProduto: (id: string) => string): string {
  return itens.map((item) => `${item.quantidade}× ${nomeProduto(item.produto_id)}`).join(" + ");
}

// Mesmos produtos com as mesmas quantidades, em qualquer ordem.
export function itensIguais(a: readonly ItemPedido[], b: readonly ItemPedido[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const quantidades = new Map(a.map((item) => [item.produto_id, item.quantidade]));
  return b.every((item) => quantidades.get(item.produto_id) === item.quantidade);
}
