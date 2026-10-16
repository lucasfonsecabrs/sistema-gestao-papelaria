"use client";

import { useMemo, useState, type FormEvent } from "react";

import type { RespostaApi } from "@/lib/cliente-api";
import { CATEGORIAS_INSUMO, formatarQuantidade, normalizarUnidade, ROTULO_UNIDADE, UNIDADES } from "@/lib/estoque";
import { adicionarDias, paraDataIso, ROTULO_STATUS, STATUS_PEDIDO, type StatusPedido } from "@/lib/pedidos";
import { detalharProduto, type Configuracoes } from "@/lib/precificacao";
import type { Cliente, Insumo, Pedido, Produto } from "@/lib/store";
import type { ProdutoComDetalhe } from "@/lib/visao";

import {
  classeBotaoLinha,
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeCampo,
  classeRotulo,
  formatarCustoUnitario,
  formatarMoeda,
  MensagemErro,
} from "./ui";

type DadosNovoCliente = { nome: string; contato: string; confirmarDuplicado?: boolean };

function lerDuplicado(resposta: RespostaApi<unknown>): Cliente | null {
  return !resposta.ok && resposta.status === 409 ? ((resposta.corpo.duplicado as Cliente) ?? null) : null;
}

function AvisoDuplicado({
  duplicado,
  onUsarExistente,
  onConfirmar,
}: {
  duplicado: Cliente;
  onUsarExistente?: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p>
        Já existe um cliente parecido: <strong>{duplicado.nome}</strong> ({duplicado.contato}).
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {onUsarExistente && (
          <button type="button" onClick={onUsarExistente} className={classeBotaoLinha}>
            Usar {duplicado.nome}
          </button>
        )}
        <button type="button" onClick={onConfirmar} className={classeBotaoLinha}>
          Cadastrar mesmo assim
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Cliente

export function FormularioCliente({
  cliente,
  onSalvar,
  onCancelar,
}: {
  cliente?: Cliente;
  onSalvar: (dados: DadosNovoCliente) => Promise<RespostaApi<Cliente>>;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState({ nome: cliente?.nome ?? "", contato: cliente?.contato ?? "" });
  const [erro, setErro] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState<Cliente | null>(null);
  const [salvando, setSalvando] = useState(false);

  const salvar = async (confirmarDuplicado = false) => {
    setSalvando(true);
    setErro(null);
    const resposta = await onSalvar({ ...form, confirmarDuplicado });
    setSalvando(false);

    if (!resposta.ok) {
      const parecido = lerDuplicado(resposta);
      setDuplicado(parecido);
      setErro(parecido ? null : resposta.erro);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void salvar();
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="cliente_nome" className={classeRotulo}>Nome</label>
        <input
          id="cliente_nome"
          value={form.nome}
          required
          autoFocus
          onChange={(event) => {
            setDuplicado(null);
            setForm((atual) => ({ ...atual, nome: event.target.value }));
          }}
          className={classeCampo}
          placeholder="Ex: Fernanda Lima"
        />
      </div>
      <div>
        <label htmlFor="cliente_contato" className={classeRotulo}>Contato (telefone, WhatsApp ou e-mail)</label>
        <input
          id="cliente_contato"
          value={form.contato}
          required
          onChange={(event) => {
            setDuplicado(null);
            setForm((atual) => ({ ...atual, contato: event.target.value }));
          }}
          className={classeCampo}
          placeholder="(14) 99999-0000"
        />
      </div>

      {duplicado && <AvisoDuplicado duplicado={duplicado} onConfirmar={() => void salvar(true)} />}
      <MensagemErro mensagem={erro} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancelar} className={classeBotaoSecundario}>Cancelar</button>
        <button type="submit" disabled={salvando} className={classeBotaoPrimario}>
          {salvando ? "Salvando…" : cliente ? "Salvar alterações" : "Cadastrar cliente"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Insumo

export function FormularioInsumo({
  insumo,
  produtosQueUsam,
  onSalvar,
  onCancelar,
}: {
  insumo?: Insumo;
  produtosQueUsam: number;
  onSalvar: (dados: Record<string, unknown>) => Promise<RespostaApi<Insumo>>;
  onCancelar: () => void;
}) {
  const unidadeOriginal = insumo ? normalizarUnidade(insumo.unidade) ?? "unidade" : "unidade";
  const [form, setForm] = useState({
    nome: insumo?.nome ?? "",
    categoria: insumo?.categoria ?? "Outros",
    unidade: unidadeOriginal,
    quantidade_estoque: insumo ? String(insumo.quantidade_estoque) : "",
    quantidade_minima: insumo ? String(insumo.quantidade_minima) : "",
    custo_unitario: insumo ? String(insumo.custo_unitario) : "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const atualizar = (campo: keyof typeof form, valor: string) =>
    setForm((atual) => ({ ...atual, [campo]: valor }));

  const valorEmEstoque = Number(form.quantidade_estoque) * Number(form.custo_unitario);
  const unidadeMudou = Boolean(insumo) && form.unidade !== unidadeOriginal;

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    const resposta = await onSalvar({
      ...form,
      quantidade_estoque: Number(form.quantidade_estoque),
      quantidade_minima: Number(form.quantidade_minima),
      custo_unitario: Number(form.custo_unitario),
    });
    setSalvando(false);

    if (!resposta.ok) setErro(resposta.erro);
  };

  return (
    <form onSubmit={enviar} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label htmlFor="insumo_nome" className={classeRotulo}>Nome do insumo</label>
        <input
          id="insumo_nome"
          value={form.nome}
          required
          autoFocus
          onChange={(event) => atualizar("nome", event.target.value)}
          className={classeCampo}
          placeholder="Ex: Papel Kraft 180g A4"
        />
      </div>

      <div>
        <label htmlFor="insumo_categoria" className={classeRotulo}>Categoria</label>
        <select id="insumo_categoria" value={form.categoria} onChange={(event) => atualizar("categoria", event.target.value)} className={classeCampo}>
          {CATEGORIAS_INSUMO.map((categoria) => (
            <option key={categoria} value={categoria}>{categoria}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="insumo_unidade" className={classeRotulo}>Unidade de medida</label>
        <select id="insumo_unidade" value={form.unidade} onChange={(event) => atualizar("unidade", event.target.value)} className={classeCampo}>
          {UNIDADES.map((unidade) => (
            <option key={unidade} value={unidade}>{ROTULO_UNIDADE[unidade]}</option>
          ))}
        </select>
      </div>

      <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600 md:col-span-2">
        Tudo deste insumo usa a mesma unidade: estoque, mínimo, custo e o consumo nos produtos. Ex.: se a fita é
        controlada em <strong>cm</strong>, informe o custo de 1 cm e o consumo em cm.
      </p>

      {unidadeMudou && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 md:col-span-2">
          Mudar a unidade <strong>não converte</strong> os números. Revise estoque, mínimo e custo
          {produtosQueUsam > 0 && <> e a quantidade usada nos {produtosQueUsam} produto(s) que usam este insumo</>}.
        </p>
      )}

      <div>
        <label htmlFor="insumo_estoque" className={classeRotulo}>Quantidade em estoque ({form.unidade})</label>
        <input id="insumo_estoque" type="number" min="0" step="any" required value={form.quantidade_estoque} onChange={(event) => atualizar("quantidade_estoque", event.target.value)} className={classeCampo} />
      </div>

      <div>
        <label htmlFor="insumo_minimo" className={classeRotulo}>Estoque mínimo ({form.unidade})</label>
        <input id="insumo_minimo" type="number" min="0" step="any" required value={form.quantidade_minima} onChange={(event) => atualizar("quantidade_minima", event.target.value)} className={classeCampo} />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="insumo_custo" className={classeRotulo}>Custo por {form.unidade} (R$)</label>
        <input id="insumo_custo" type="number" min="0" step="any" required value={form.custo_unitario} onChange={(event) => atualizar("custo_unitario", event.target.value)} className={classeCampo} placeholder="0,00" />
        {Number.isFinite(valorEmEstoque) && valorEmEstoque > 0 && (
          <p className="mt-1.5 text-xs text-stone-500">Valor total em estoque: {formatarMoeda(valorEmEstoque)}</p>
        )}
      </div>

      <div className="md:col-span-2">
        <MensagemErro mensagem={erro} />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2">
        <button type="button" onClick={onCancelar} className={classeBotaoSecundario}>Cancelar</button>
        <button type="submit" disabled={salvando} className={classeBotaoPrimario}>
          {salvando ? "Salvando…" : insumo ? "Salvar alterações" : "Cadastrar insumo"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Produto

type LinhaForm = { chave: string; insumo_id: string; quantidade: string };

function agruparPorCategoria(insumos: readonly Insumo[]) {
  const grupos = new Map<string, Insumo[]>();
  for (const insumo of [...insumos].sort((a, b) => a.nome.localeCompare(b.nome))) {
    const categoria = insumo.categoria ?? "Outros";
    grupos.set(categoria, [...(grupos.get(categoria) ?? []), insumo]);
  }
  return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function FormularioProduto({
  produto,
  insumos,
  insumosRemovidos,
  configuracoes,
  onSalvar,
  onCancelar,
}: {
  produto?: Produto;
  insumos: Insumo[];
  insumosRemovidos: Insumo[];
  configuracoes: Configuracoes;
  onSalvar: (dados: Record<string, unknown>) => Promise<RespostaApi<Produto>>;
  onCancelar: () => void;
}) {
  const [form, setForm] = useState({
    nome: produto?.nome ?? "",
    margem_desejada: produto ? String(produto.margem_desejada) : "50",
    tempo_producao_minutos: produto ? String(produto.tempo_producao_minutos ?? 0) : "",
  });
  const [linhas, setLinhas] = useState<LinhaForm[]>(() =>
    (produto?.insumos ?? []).map((item) => ({
      chave: crypto.randomUUID(),
      insumo_id: item.insumo_id,
      quantidade: String(item.quantidade_por_unidade),
    })),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const grupos = useMemo(() => agruparPorCategoria(insumos), [insumos]);
  const ativos = useMemo(() => new Set(insumos.map((insumo) => insumo.id)), [insumos]);

  const detalhe = detalharProduto(
    {
      margem_desejada: Number(form.margem_desejada) || 0,
      tempo_producao_minutos: Number(form.tempo_producao_minutos) || 0,
      insumos: linhas.map((linha) => ({
        insumo_id: linha.insumo_id,
        quantidade_por_unidade: Number(linha.quantidade) || 0,
      })),
    },
    insumos,
    insumosRemovidos,
    configuracoes,
  );

  const atualizarLinha = (chave: string, campo: "insumo_id" | "quantidade", valor: string) =>
    setLinhas((atual) => atual.map((linha) => (linha.chave === chave ? { ...linha, [campo]: valor } : linha)));

  const mover = (indice: number, direcao: -1 | 1) =>
    setLinhas((atual) => {
      const destino = indice + direcao;
      if (destino < 0 || destino >= atual.length) return atual;
      const copia = [...atual];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    const resposta = await onSalvar({
      nome: form.nome,
      margem_desejada: Number(form.margem_desejada),
      tempo_producao_minutos: Number(form.tempo_producao_minutos || 0),
      insumos: linhas.map((linha) => ({
        insumo_id: linha.insumo_id,
        quantidade_por_unidade: Number(linha.quantidade),
      })),
    });
    setSalvando(false);

    if (!resposta.ok) setErro(resposta.erro);
  };

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem_10rem]">
        <div>
          <label htmlFor="produto_nome" className={classeRotulo}>Nome do produto</label>
          <input id="produto_nome" value={form.nome} required autoFocus onChange={(event) => setForm((atual) => ({ ...atual, nome: event.target.value }))} className={classeCampo} placeholder="Ex: Topo de bolo" />
        </div>
        <div>
          <label htmlFor="produto_tempo" className={classeRotulo}>Tempo de produção (min)</label>
          <input id="produto_tempo" type="number" min="0" step="any" value={form.tempo_producao_minutos} onChange={(event) => setForm((atual) => ({ ...atual, tempo_producao_minutos: event.target.value }))} className={classeCampo} placeholder="0" aria-describedby="produto_tempo_ajuda" />
        </div>
        <div>
          <label htmlFor="produto_margem" className={classeRotulo}>Margem de lucro (%)</label>
          <input id="produto_margem" type="number" min="0" step="any" required value={form.margem_desejada} onChange={(event) => setForm((atual) => ({ ...atual, margem_desejada: event.target.value }))} className={classeCampo} />
        </div>
        <p id="produto_tempo_ajuda" className="-mt-2 text-xs text-stone-500 sm:col-span-3">
          Tempo para fazer 1 unidade. A mão de obra usa o valor da hora definido em Configurações ({formatarMoeda(configuracoes.valor_hora_trabalho)}/hora).
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-stone-700">Insumos usados em 1 unidade do produto</p>
        </div>

        {linhas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-center text-sm text-stone-500">
            Nenhum insumo ainda. Adicione o que é gasto para fazer uma unidade.
          </p>
        ) : (
          <ol className="space-y-2">
            {linhas.map((linha, indice) => {
              const info = detalhe.linhas[indice];
              const problema = !ativos.has(linha.insumo_id);
              return (
                <li key={linha.chave} className={`rounded-lg border p-3 ${problema ? "border-red-200 bg-red-50" : "border-stone-200 bg-white"}`}>
                  <div className="grid gap-2 sm:grid-cols-[1fr_9rem_auto] sm:items-center">
                    <select
                      aria-label={`Insumo da linha ${indice + 1}`}
                      value={linha.insumo_id}
                      onChange={(event) => atualizarLinha(linha.chave, "insumo_id", event.target.value)}
                      className={classeCampo}
                    >
                      {problema && <option value={linha.insumo_id}>⚠ {info?.nome} (indisponível)</option>}
                      {grupos.map(([categoria, itens]) => (
                        <optgroup key={categoria} label={categoria}>
                          {itens.map((insumo) => (
                            <option key={insumo.id} value={insumo.id}>{insumo.nome} ({insumo.unidade})</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        aria-label={`Quantidade da linha ${indice + 1}`}
                        value={linha.quantidade}
                        onChange={(event) => atualizarLinha(linha.chave, "quantidade", event.target.value)}
                        className={classeCampo}
                      />
                      <span className="w-14 shrink-0 text-xs text-stone-500">{info?.unidade}</span>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => mover(indice, -1)} disabled={indice === 0} className={classeBotaoLinha} aria-label="Mover para cima">↑</button>
                      <button type="button" onClick={() => mover(indice, 1)} disabled={indice === linhas.length - 1} className={classeBotaoLinha} aria-label="Mover para baixo">↓</button>
                      <button type="button" onClick={() => setLinhas((atual) => atual.filter((item) => item.chave !== linha.chave))} className={classeBotaoLinha} aria-label="Remover insumo">Remover</button>
                    </div>
                  </div>
                  <p className={`mt-1.5 text-xs ${problema ? "font-semibold text-red-700" : "text-stone-500"}`}>
                    {problema
                      ? info?.situacao === "removido"
                        ? "Este insumo está na lixeira. Troque por outro, remova a linha ou restaure o insumo no Estoque."
                        : "Este insumo não existe mais. Troque por outro ou remova a linha."
                      : `${info ? formatarQuantidade(info.quantidade, info.unidade) : ""} × ${formatarCustoUnitario(info?.custoUnitario ?? 0)} = ${formatarMoeda(info?.custoTotal ?? 0)}`}
                  </p>
                </li>
              );
            })}
          </ol>
        )}

        <button
          type="button"
          disabled={insumos.length === 0}
          onClick={() =>
            setLinhas((atual) => [...atual, { chave: crypto.randomUUID(), insumo_id: insumos[0]?.id ?? "", quantidade: "1" }])
          }
          className={`mt-3 ${classeBotaoSecundario}`}
        >
          + Adicionar insumo
        </button>
      </div>

      <ComposicaoPreco detalhe={detalhe} configuracoes={configuracoes} margem={Number(form.margem_desejada) || 0} />

      <MensagemErro mensagem={erro} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancelar} className={classeBotaoSecundario}>Cancelar</button>
        <button type="submit" disabled={salvando} className={classeBotaoPrimario}>
          {salvando ? "Salvando…" : produto ? "Salvar alterações" : "Cadastrar produto"}
        </button>
      </div>
    </form>
  );
}

export function ComposicaoPreco({
  detalhe,
  configuracoes,
  margem,
}: {
  detalhe: ReturnType<typeof detalharProduto>;
  configuracoes: Configuracoes;
  margem: number;
}) {
  const linhas = [
    { rotulo: "Insumos", valor: detalhe.custoInsumos },
    { rotulo: "+ Mão de obra", valor: detalhe.custoMaoObra },
    { rotulo: `+ Perdas (${configuracoes.percentual_perdas}%)`, valor: detalhe.custoComPerdas - detalhe.custoBase },
    { rotulo: `+ Custos fixos (${configuracoes.percentual_custos_fixos}%)`, valor: detalhe.custoTotal - detalhe.custoComPerdas },
  ];

  return (
    <dl className="rounded-lg bg-stone-50 p-3 text-sm ring-1 ring-stone-200">
      {linhas.map((linha) => (
        <div key={linha.rotulo} className="flex justify-between py-0.5 text-stone-600">
          <dt>{linha.rotulo}</dt>
          <dd>{formatarMoeda(linha.valor)}</dd>
        </div>
      ))}
      <div className="mt-1 flex justify-between border-t border-stone-200 pt-1.5 font-semibold text-stone-900">
        <dt>Custo total</dt>
        <dd>{formatarMoeda(detalhe.custoTotal)}</dd>
      </div>
      <div className="flex justify-between py-0.5 text-stone-600">
        <dt>+ Margem ({margem}%)</dt>
        <dd>{formatarMoeda(detalhe.lucroUnitario)}</dd>
      </div>
      <div className="mt-1 flex justify-between border-t border-stone-200 pt-1.5 text-base font-black text-stone-900">
        <dt>Preço sugerido</dt>
        <dd>{formatarMoeda(detalhe.precoSugerido)}</dd>
      </div>
    </dl>
  );
}

// ---------------------------------------------------------------- Pedido

export function FormularioPedido({
  pedido,
  clienteInicialId,
  clientes,
  clientesRemovidos,
  produtos,
  produtosRemovidos,
  hoje,
  onCriarCliente,
  onSalvar,
  onCancelar,
}: {
  pedido?: Pedido;
  clienteInicialId?: string;
  clientes: Cliente[];
  clientesRemovidos: Cliente[];
  produtos: ProdutoComDetalhe[];
  produtosRemovidos: Produto[];
  hoje: Date;
  onCriarCliente: (dados: DadosNovoCliente) => Promise<RespostaApi<Cliente>>;
  onSalvar: (dados: Record<string, unknown>) => Promise<RespostaApi<Pedido>>;
  onCancelar: () => void;
}) {
  const [modoCliente, setModoCliente] = useState<"existente" | "novo">(
    clientes.length === 0 && !pedido ? "novo" : "existente",
  );
  const [novoCliente, setNovoCliente] = useState({ nome: "", contato: "" });
  const [duplicado, setDuplicado] = useState<Cliente | null>(null);
  const [form, setForm] = useState({
    cliente_id: pedido?.cliente_id ?? clienteInicialId ?? clientes[0]?.id ?? "",
    produto_id: pedido?.produto_id ?? produtos[0]?.id ?? "",
    cores: pedido?.cores ?? "",
    texto_personalizacao: pedido?.texto_personalizacao ?? "",
    quantidade: pedido ? String(pedido.quantidade) : "1",
    data_entrega: pedido?.data_entrega ?? paraDataIso(adicionarDias(hoje, 7)),
    status: pedido?.status ?? ("pendente" as StatusPedido),
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const atualizar = (campo: keyof typeof form, valor: string) =>
    setForm((atual) => ({ ...atual, [campo]: valor }));

  const clienteRemovido = clientesRemovidos.find((cliente) => cliente.id === form.cliente_id);
  const produtoRemovido = produtosRemovidos.find((produto) => produto.id === form.produto_id);
  const produto = produtos.find((item) => item.id === form.produto_id);
  const quantidade = Number(form.quantidade) || 0;
  // Same formula as the server: suggested unit price × quantity.
  const valorCalculado = produto ? Number((produto.detalhe.precoSugerido * quantidade).toFixed(2)) : 0;
  const mantemValor =
    pedido !== undefined && pedido.produto_id === form.produto_id && pedido.quantidade === quantidade;
  // Ao editar, qualquer situação pode ser escolhida (inclusive voltar uma etapa).
  const statusPermitidos: readonly StatusPedido[] = pedido ? STATUS_PEDIDO : ["pendente"];

  const garantirCliente = async (confirmarDuplicado: boolean): Promise<string | null> => {
    if (modoCliente === "existente") {
      return form.cliente_id || null;
    }

    const resposta = await onCriarCliente({ ...novoCliente, confirmarDuplicado });

    if (!resposta.ok) {
      const parecido = lerDuplicado(resposta);
      setDuplicado(parecido);
      if (!parecido) setErro(resposta.erro);
      return null;
    }

    // From here on the client exists: a retry must not create it again.
    setForm((atual) => ({ ...atual, cliente_id: resposta.dados.id }));
    setModoCliente("existente");
    setNovoCliente({ nome: "", contato: "" });
    return resposta.dados.id;
  };

  const salvar = async (confirmarDuplicado = false) => {
    setSalvando(true);
    setErro(null);

    const clienteId = await garantirCliente(confirmarDuplicado);

    if (!clienteId) {
      if (modoCliente === "existente") setErro("Escolha um cliente.");
      setSalvando(false);
      return;
    }

    setDuplicado(null);
    const resposta = await onSalvar({ ...form, cliente_id: clienteId, quantidade });
    setSalvando(false);

    if (!resposta.ok) setErro(resposta.erro);
  };

  if (produtos.length === 0 && !pedido) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-stone-600">Cadastre pelo menos um produto antes de criar pedidos.</p>
        <div className="flex justify-end">
          <button type="button" onClick={onCancelar} className={classeBotaoSecundario}>Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void salvar();
      }}
      className="grid gap-4 md:grid-cols-2"
    >
      <fieldset className="md:col-span-2">
        <legend className={classeRotulo}>Cliente</legend>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["existente", "novo"] as const).map((modo) => (
            <button
              key={modo}
              type="button"
              aria-pressed={modoCliente === modo}
              onClick={() => {
                setDuplicado(null);
                setModoCliente(modo);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                modoCliente === modo ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {modo === "existente" ? "Já cadastrado" : "Cliente novo"}
            </button>
          ))}
        </div>

        {modoCliente === "existente" ? (
          <select
            aria-label="Cliente"
            value={form.cliente_id}
            required
            onChange={(event) => atualizar("cliente_id", event.target.value)}
            className={classeCampo}
          >
            {!form.cliente_id && <option value="">Escolha um cliente</option>}
            {clienteRemovido && <option value={clienteRemovido.id}>{clienteRemovido.nome} (na lixeira)</option>}
            {[...clientes]
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome} · {cliente.contato}</option>
              ))}
          </select>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <input
              aria-label="Nome do cliente novo"
              value={novoCliente.nome}
              required
              onChange={(event) => {
                setDuplicado(null);
                setNovoCliente((atual) => ({ ...atual, nome: event.target.value }));
              }}
              placeholder="Nome do cliente"
              className={classeCampo}
            />
            <input
              aria-label="Contato do cliente novo"
              value={novoCliente.contato}
              required
              onChange={(event) => {
                setDuplicado(null);
                setNovoCliente((atual) => ({ ...atual, contato: event.target.value }));
              }}
              placeholder="Telefone ou WhatsApp"
              className={classeCampo}
            />
          </div>
        )}

        {duplicado && (
          <div className="mt-3">
            <AvisoDuplicado
              duplicado={duplicado}
              onUsarExistente={() => {
                setForm((atual) => ({ ...atual, cliente_id: duplicado.id }));
                setModoCliente("existente");
                setDuplicado(null);
              }}
              onConfirmar={() => void salvar(true)}
            />
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor="pedido_produto" className={classeRotulo}>Produto</label>
        <select id="pedido_produto" value={form.produto_id} required onChange={(event) => atualizar("produto_id", event.target.value)} className={classeCampo}>
          {produtoRemovido && <option value={produtoRemovido.id}>{produtoRemovido.nome} (na lixeira)</option>}
          {[...produtos]
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
        </select>
        {produto && produto.detalhe.insumosComProblema.length > 0 && (
          <p className="mt-1.5 text-xs font-semibold text-red-700">
            Este produto usa insumo removido; o valor pode estar abaixo do real.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="pedido_quantidade" className={classeRotulo}>Quantidade</label>
        <input id="pedido_quantidade" type="number" min="1" step="1" required value={form.quantidade} onChange={(event) => atualizar("quantidade", event.target.value)} className={classeCampo} />
      </div>

      <div>
        <label htmlFor="pedido_cores" className={classeRotulo}>Cores</label>
        <input id="pedido_cores" value={form.cores} onChange={(event) => atualizar("cores", event.target.value)} className={classeCampo} placeholder="Azul, rosa e dourado" />
      </div>

      <div>
        <label htmlFor="pedido_entrega" className={classeRotulo}>Data de entrega</label>
        <input id="pedido_entrega" type="date" required value={form.data_entrega} onChange={(event) => atualizar("data_entrega", event.target.value)} className={classeCampo} />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="pedido_texto" className={classeRotulo}>Texto da personalização</label>
        <textarea id="pedido_texto" value={form.texto_personalizacao} onChange={(event) => atualizar("texto_personalizacao", event.target.value)} className={`min-h-20 ${classeCampo}`} placeholder="Ex: Feliz aniversário, Ana!" />
      </div>

      {pedido && (
        <div>
          <label htmlFor="pedido_status" className={classeRotulo}>Situação</label>
          <select id="pedido_status" value={form.status} onChange={(event) => atualizar("status", event.target.value)} className={classeCampo}>
            {statusPermitidos.map((status) => (
              <option key={status} value={status}>
                {status === pedido.status ? ROTULO_STATUS[status] : `Avançar para: ${ROTULO_STATUS[status]}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={`rounded-lg bg-stone-50 p-3 ring-1 ring-stone-200 ${pedido ? "" : "md:col-span-2"}`}>
        {mantemValor && pedido ? (
          <>
            <p className="text-xs text-stone-500">Valor combinado</p>
            <p className="text-xl font-black text-stone-900">{formatarMoeda(pedido.valor_final)}</p>
            {Math.abs(valorCalculado - pedido.valor_final) >= 0.01 && (
              <p className="mt-1 text-xs text-stone-500">
                Pelos custos de hoje seria {formatarMoeda(valorCalculado)}. O valor só é recalculado se mudar produto ou quantidade.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-xs text-stone-500">Valor calculado automaticamente</p>
            <p className="text-xl font-black text-stone-900">{formatarMoeda(valorCalculado)}</p>
            {produto && quantidade > 0 && (
              <p className="mt-1 text-xs text-stone-500">
                {quantidade} × {formatarMoeda(produto.detalhe.precoSugerido)} (custo total {formatarMoeda(produto.detalhe.custoTotal)} + {produto.margem_desejada}% de margem)
              </p>
            )}
          </>
        )}
      </div>

      <div className="md:col-span-2">
        <MensagemErro mensagem={erro} />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2">
        <button type="button" onClick={onCancelar} className={classeBotaoSecundario}>Cancelar</button>
        <button type="submit" disabled={salvando} className={classeBotaoPrimario}>
          {salvando ? "Salvando…" : pedido ? "Salvar alterações" : "Criar pedido"}
        </button>
      </div>
    </form>
  );
}
