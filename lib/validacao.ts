import { CATEGORIAS_INSUMO, normalizarUnidade, UNIDADES, type Unidade } from "./estoque";
import type { Configuracoes } from "./precificacao";
import {
  dataIsoValida,
  statusValido,
  type ItemPedido,
  type StatusPedido,
} from "./pedidos";

export type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string };

type Payload = Record<string, unknown>;

class ErroValidacao extends Error {}

function falhar(mensagem: string): never {
  throw new ErroValidacao(mensagem);
}

function validar<T>(fn: () => T): Resultado<T> {
  try {
    return { ok: true, dados: fn() };
  } catch (error) {
    if (error instanceof ErroValidacao) {
      return { ok: false, erro: error.message };
    }

    throw error;
  }
}

// For partial updates a missing field falls back to the stored value.
function campo(payload: Payload, atual: Payload | undefined, nome: string): unknown {
  return payload[nome] !== undefined ? payload[nome] : atual?.[nome];
}

function textoObrigatorio(valor: unknown, rotulo: string): string {
  const texto = typeof valor === "string" ? valor.trim() : "";

  if (!texto) {
    falhar(`${rotulo} é obrigatório.`);
  }

  return texto;
}

function textoOpcional(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function numeroNaoNegativo(valor: unknown, rotulo: string): number {
  const numero = typeof valor === "string" && valor.trim() !== "" ? Number(valor) : valor;

  if (typeof numero !== "number" || !Number.isFinite(numero)) {
    falhar(`${rotulo} deve ser um número.`);
  }

  if (numero < 0) {
    falhar(`${rotulo} não pode ser negativo.`);
  }

  return numero;
}

export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type DadosCliente = { nome: string; contato: string };

export function validarCliente(payload: Payload, atual?: DadosCliente): Resultado<DadosCliente> {
  return validar(() => ({
    nome: textoObrigatorio(campo(payload, atual, "nome"), "Nome do cliente"),
    contato: textoObrigatorio(campo(payload, atual, "contato"), "Contato"),
  }));
}

function normalizarContato(contato: string): string {
  const digitos = contato.replace(/\D/g, "");
  return digitos.length >= 8 ? digitos : normalizarTexto(contato);
}

export function encontrarClienteDuplicado<T extends DadosCliente & { id: string }>(
  clientes: readonly T[],
  dados: DadosCliente,
  ignorarId?: string,
): T | undefined {
  const nome = normalizarTexto(dados.nome);
  const contato = normalizarContato(dados.contato);

  return clientes.find(
    (cliente) =>
      cliente.id !== ignorarId &&
      (normalizarTexto(cliente.nome) === nome || normalizarContato(cliente.contato) === contato),
  );
}

export type DadosInsumo = {
  nome: string;
  categoria: string;
  unidade: Unidade;
  quantidade_estoque: number;
  quantidade_minima: number;
  custo_unitario: number;
};

export function validarInsumo(
  payload: Payload,
  atual?: Partial<Record<keyof DadosInsumo, unknown>>,
): Resultado<DadosInsumo> {
  return validar(() => {
    const unidade = normalizarUnidade(campo(payload, atual, "unidade"));

    if (!unidade) {
      falhar(`Unidade inválida. Use: ${UNIDADES.join(", ")}.`);
    }

    const categoria = textoOpcional(campo(payload, atual, "categoria")) || "Outros";

    return {
      nome: textoObrigatorio(campo(payload, atual, "nome"), "Nome do insumo"),
      categoria: (CATEGORIAS_INSUMO as readonly string[]).includes(categoria) ? categoria : "Outros",
      unidade,
      quantidade_estoque: numeroNaoNegativo(campo(payload, atual, "quantidade_estoque"), "Quantidade em estoque"),
      quantidade_minima: numeroNaoNegativo(campo(payload, atual, "quantidade_minima"), "Estoque mínimo"),
      custo_unitario: numeroNaoNegativo(campo(payload, atual, "custo_unitario"), "Custo por unidade"),
    };
  });
}

export type DadosProduto = {
  nome: string;
  margem_desejada: number;
  tempo_producao_minutos: number;
  insumos: { insumo_id: string; quantidade_por_unidade: number }[];
};

export function validarProduto(
  payload: Payload,
  insumosAtivos: ReadonlySet<string>,
  atual?: Partial<Record<keyof DadosProduto, unknown>>,
): Resultado<DadosProduto> {
  return validar(() => {
    const linhas = campo(payload, atual, "insumos") ?? [];

    if (!Array.isArray(linhas)) {
      falhar("A composição de insumos é inválida.");
    }

    const insumos = linhas.map((linha: unknown, index: number) => {
      const item = (linha ?? {}) as Payload;
      const insumoId = textoObrigatorio(item.insumo_id, `Insumo da linha ${index + 1}`);

      if (!insumosAtivos.has(insumoId)) {
        falhar(`O insumo da linha ${index + 1} não existe no estoque ou está na lixeira.`);
      }

      const quantidade = numeroNaoNegativo(item.quantidade_por_unidade, `Quantidade da linha ${index + 1}`);

      if (quantidade === 0) {
        falhar(`Quantidade da linha ${index + 1} deve ser maior que zero.`);
      }

      return { insumo_id: insumoId, quantidade_por_unidade: quantidade };
    });

    // produto_insumos is keyed by (produto_id, insumo_id): one line per insumo.
    const repetido = insumos.findIndex(
      (item, index) => insumos.findIndex((outro) => outro.insumo_id === item.insumo_id) !== index,
    );

    if (repetido !== -1) {
      falhar(`O insumo da linha ${repetido + 1} já foi usado em outra linha. Some as quantidades em uma linha só.`);
    }

    return {
      nome: textoObrigatorio(campo(payload, atual, "nome"), "Nome do produto"),
      margem_desejada: numeroNaoNegativo(campo(payload, atual, "margem_desejada"), "Margem"),
      tempo_producao_minutos: numeroNaoNegativo(
        campo(payload, atual, "tempo_producao_minutos") ?? 0,
        "Tempo de produção",
      ),
      insumos,
    };
  });
}

export type DadosPedido = {
  cliente_id: string;
  itens: ItemPedido[];
  cores: string;
  texto_personalizacao: string;
  data_entrega: string;
  status: StatusPedido;
};

export function validarPedido(
  payload: Payload,
  vinculos: { clientes: ReadonlySet<string>; produtos: ReadonlySet<string> },
  atual?: DadosPedido,
): Resultado<DadosPedido> {
  return validar(() => {
    const clienteId = textoObrigatorio(campo(payload, atual, "cliente_id"), "Cliente");

    // Links are only checked when they change, so an order whose client or
    // product was later moved to the trash can still be edited.
    if (clienteId !== atual?.cliente_id && !vinculos.clientes.has(clienteId)) {
      falhar("Cliente não encontrado.");
    }

    const linhas = campo(payload, atual, "itens");

    if (!Array.isArray(linhas) || linhas.length === 0) {
      falhar("Adicione pelo menos um produto ao pedido.");
    }

    const produtosAtuais = new Set(atual?.itens.map((item) => item.produto_id));
    const itens = (linhas as unknown[]).map((linha, index) => {
      const item = (linha ?? {}) as Payload;
      const produtoId = textoObrigatorio(item.produto_id, `Produto da linha ${index + 1}`);

      if (!produtosAtuais.has(produtoId) && !vinculos.produtos.has(produtoId)) {
        falhar(`O produto da linha ${index + 1} não foi encontrado.`);
      }

      const quantidade = Number(item.quantidade);

      if (!Number.isInteger(quantidade) || quantidade < 1) {
        falhar(`A quantidade da linha ${index + 1} deve ser um número inteiro maior que zero.`);
      }

      return { produto_id: produtoId, quantidade };
    });

    // pedido_itens is keyed by (pedido_id, produto_id): one line per product.
    const repetido = itens.findIndex(
      (item, index) => itens.findIndex((outro) => outro.produto_id === item.produto_id) !== index,
    );

    if (repetido !== -1) {
      falhar(`O produto da linha ${repetido + 1} já está no pedido. Some as quantidades em uma linha só.`);
    }

    const dataEntrega = textoObrigatorio(campo(payload, atual, "data_entrega"), "Data de entrega");

    if (!dataIsoValida(dataEntrega)) {
      falhar("Data de entrega inválida.");
    }

    const status = campo(payload, atual, "status") ?? "pendente";

    if (!statusValido(status)) {
      falhar("Status inválido.");
    }

    return {
      cliente_id: clienteId,
      itens,
      cores: textoOpcional(campo(payload, atual, "cores")),
      texto_personalizacao: textoOpcional(campo(payload, atual, "texto_personalizacao")),
      data_entrega: dataEntrega,
      status,
    };
  });
}

export function validarConfiguracoes(
  payload: Payload,
  atual?: Configuracoes,
): Resultado<Configuracoes> {
  return validar(() => ({
    valor_hora_trabalho: numeroNaoNegativo(campo(payload, atual, "valor_hora_trabalho") ?? 0, "Valor da hora de trabalho"),
    percentual_perdas: numeroNaoNegativo(campo(payload, atual, "percentual_perdas") ?? 0, "Percentual de perdas"),
    percentual_custos_fixos: numeroNaoNegativo(
      campo(payload, atual, "percentual_custos_fixos") ?? 0,
      "Percentual de custos fixos",
    ),
  }));
}
