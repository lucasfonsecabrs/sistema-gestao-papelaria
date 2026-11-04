"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CATEGORIAS_INSUMO, formatarQuantidade } from "@/lib/estoque";
import { descreverItens, formatarData, proximoStatus, ROTULO_STATUS, STATUS_PEDIDO } from "@/lib/pedidos";
import type { Configuracoes } from "@/lib/precificacao";
import type { Cliente, Insumo, Pedido, Produto } from "@/lib/store";
import {
  contem,
  FILTROS_ESTOQUE_PADRAO,
  FILTROS_PEDIDO_PADRAO,
  filtrarInsumos,
  filtrarPedidos,
  pedidoAberto,
  urgenciaDoPedido,
  type FiltrosEstoque,
  type FiltrosPedido,
  type InsumoComSituacao,
  type ProdutoComDetalhe,
  type ResumoCliente,
  type resumirPainel,
} from "@/lib/visao";

import {
  CabecalhoSecao,
  CampoBusca,
  classeBotaoLinha,
  classeBotaoLinhaPerigo,
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeCampo,
  classePainel,
  EstadoVazio,
  formatarCustoUnitario,
  formatarMoeda,
  PainelLixeira,
  Selo,
  SeloEstoque,
  SeloStatus,
  SeloUrgencia,
} from "./ui";

export type Nomes = {
  cliente: (id: string) => string;
  produto: (id: string) => string;
};

function BotaoLixeira({ quantidade, aberta, onAlternar }: { quantidade: number; aberta: boolean; onAlternar: () => void }) {
  return (
    <button type="button" onClick={onAlternar} aria-expanded={aberta} className={classeBotaoSecundario}>
      Lixeira{quantidade > 0 ? ` (${quantidade})` : ""}
    </button>
  );
}

// ---------------------------------------------------------------- Painel

export function AbaPainel({
  resumo,
  nomes,
  hoje,
  onVerPedidos,
  onVerEstoque,
  onVerProdutos,
  onNovo,
  onEditarPedido,
  onAvancarPedido,
}: {
  resumo: ReturnType<typeof resumirPainel>;
  nomes: Nomes;
  hoje: Date;
  onVerPedidos: (filtros: Partial<FiltrosPedido>) => void;
  onVerEstoque: (filtros: Partial<FiltrosEstoque>) => void;
  onVerProdutos: () => void;
  onNovo: (tipo: "pedido" | "cliente" | "produto" | "insumo") => void;
  onEditarPedido: (id: string) => void;
  onAvancarPedido: (pedido: Pedido) => void;
}) {
  const indicadores = [
    {
      rotulo: "Pedidos em aberto",
      valor: String(resumo.abertos.length),
      detalhe: "Ainda não entregues",
      tom: "bg-white",
      acao: () => onVerPedidos({ status: "abertos", somenteAtencao: false }),
    },
    {
      rotulo: "Atrasados ou urgentes",
      valor: String(resumo.atencao.length),
      detalhe: resumo.atrasados > 0 ? `${resumo.atrasados} atrasado(s)` : "Entrega até amanhã",
      tom: resumo.atencao.length > 0 ? "bg-orange-50 ring-orange-200" : "bg-white",
      acao: () => onVerPedidos({ status: "abertos", somenteAtencao: true }),
    },
    {
      rotulo: "A receber",
      valor: formatarMoeda(resumo.faturamentoAberto),
      detalhe: "Soma dos pedidos em aberto",
      tom: "bg-white",
      acao: () => onVerPedidos({ status: "abertos", somenteAtencao: false }),
    },
    {
      rotulo: "Margem média",
      valor: `${resumo.margemMedia.toFixed(0)}%`,
      detalhe: "Dos produtos cadastrados",
      tom: "bg-white",
      acao: onVerProdutos,
    },
    {
      rotulo: "Alertas de estoque",
      valor: String(resumo.alertasEstoque.length),
      detalhe: resumo.criticos > 0 ? `${resumo.criticos} crítico(s)` : "Itens no mínimo ou abaixo",
      tom: resumo.criticos > 0 ? "bg-red-50 ring-red-200" : "bg-white",
      acao: () => onVerEstoque({ situacao: "alerta" }),
    },
  ];

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {indicadores.map((item) => (
          <button
            key={item.rotulo}
            type="button"
            onClick={item.acao}
            className={`rounded-xl p-4 text-left ring-1 ring-stone-200 transition hover:-translate-y-0.5 hover:shadow-md ${item.tom}`}
          >
            <p className="text-xs font-semibold text-stone-500">{item.rotulo}</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-stone-900">{item.valor}</p>
            <p className="mt-1 text-xs text-stone-500">{item.detalhe}</p>
          </button>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className={classePainel}>
          <CabecalhoSecao
            titulo="Entregas que precisam de atenção"
            descricao="Pedidos atrasados ou com entrega até amanhã."
          />
          {resumo.atencao.length === 0 ? (
            <EstadoVazio titulo="Nenhuma entrega apertada" descricao="Não há pedidos atrasados nem para hoje ou amanhã." />
          ) : (
            <ul className="space-y-2">
              {resumo.atencao.slice(0, 6).map((pedido) => {
                const proximo = proximoStatus(pedido.status);
                return (
                  <li key={pedido.id} className="flex flex-col gap-2 rounded-lg border border-stone-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-stone-900">{nomes.cliente(pedido.cliente_id)}</p>
                      <p className="text-sm text-stone-600">
                        {descreverItens(pedido.itens, nomes.produto)} · entrega {formatarData(pedido.data_entrega)}
                      </p>
                      <div className="mt-1 flex gap-1.5">
                        <SeloUrgencia urgencia={urgenciaDoPedido(pedido, hoje)} />
                        <SeloStatus status={pedido.status} />
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {proximo && (
                        <button type="button" onClick={() => onAvancarPedido(pedido)} className={classeBotaoLinha}>
                          Marcar como {ROTULO_STATUS[proximo].toLowerCase()}
                        </button>
                      )}
                      <button type="button" onClick={() => onEditarPedido(pedido.id)} className={classeBotaoLinha}>Abrir</button>
                    </div>
                  </li>
                );
              })}
              {resumo.atencao.length > 6 && (
                <li>
                  <button type="button" onClick={() => onVerPedidos({ status: "abertos", somenteAtencao: true })} className="text-sm font-semibold text-stone-700 underline underline-offset-4">
                    Ver todos os {resumo.atencao.length}
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className={classePainel}>
            <CabecalhoSecao titulo="Comprar" descricao="Insumos no mínimo ou abaixo." />
            {resumo.alertasEstoque.length === 0 ? (
              <p className="text-sm text-stone-600">Estoque em dia.</p>
            ) : (
              <ul className="space-y-2">
                {resumo.alertasEstoque.slice(0, 5).map((insumo) => (
                  <li key={insumo.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-stone-900">{insumo.nome}</span>
                      <span className="text-xs text-stone-500">
                        Tem {formatarQuantidade(insumo.quantidade_estoque, insumo.unidade)} · comprar {formatarQuantidade(insumo.reposicao, insumo.unidade)}
                      </span>
                    </span>
                    <SeloEstoque situacao={insumo.situacao} />
                  </li>
                ))}
                {resumo.alertasEstoque.length > 5 && (
                  <li>
                    <button type="button" onClick={() => onVerEstoque({ situacao: "alerta" })} className="text-sm font-semibold text-stone-700 underline underline-offset-4">
                      Ver todos os {resumo.alertasEstoque.length}
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>

          {resumo.produtosComProblema.length > 0 && (
            <button type="button" onClick={onVerProdutos} className="w-full rounded-xl border border-red-200 bg-red-50 p-4 text-left text-sm text-red-800">
              <strong>{resumo.produtosComProblema.length} produto(s)</strong> usam insumo removido e estão com custo incompleto. Toque para revisar.
            </button>
          )}

          <div className={classePainel}>
            <p className="mb-3 text-sm font-semibold text-stone-700">Cadastro rápido</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onNovo("pedido")} className={classeBotaoPrimario}>Novo pedido</button>
              <button type="button" onClick={() => onNovo("cliente")} className={classeBotaoSecundario}>Novo cliente</button>
              <button type="button" onClick={() => onNovo("produto")} className={classeBotaoSecundario}>Novo produto</button>
              <button type="button" onClick={() => onNovo("insumo")} className={classeBotaoSecundario}>Novo insumo</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Pedidos

export function AbaPedidos({
  pedidos,
  lixeira,
  filtros,
  onFiltros,
  nomes,
  hoje,
  onNovo,
  onEditar,
  onExcluir,
  onAvancar,
  onRestaurar,
}: {
  pedidos: Pedido[];
  lixeira: Pedido[];
  filtros: FiltrosPedido;
  onFiltros: (filtros: FiltrosPedido) => void;
  nomes: Nomes;
  hoje: Date;
  onNovo: () => void;
  onEditar: (id: string) => void;
  onExcluir: (pedido: Pedido) => void;
  onAvancar: (pedido: Pedido) => void;
  onRestaurar: (id: string) => Promise<void>;
}) {
  const [lixeiraAberta, setLixeiraAberta] = useState(false);
  const visiveis = useMemo(() => filtrarPedidos(pedidos, filtros, nomes, hoje), [pedidos, filtros, nomes, hoje]);
  const alterar = (parcial: Partial<FiltrosPedido>) => onFiltros({ ...filtros, ...parcial });
  const filtrosAlterados = JSON.stringify(filtros) !== JSON.stringify(FILTROS_PEDIDO_PADRAO);
  const total = visiveis.reduce((soma, pedido) => soma + pedido.valor_final, 0);

  return (
    <section className={classePainel}>
      <CabecalhoSecao
        titulo="Pedidos"
        descricao="Acompanhe entregas e avance cada pedido: pendente → em produção → pronto → entregue."
        acoes={
          <>
            <BotaoLixeira quantidade={lixeira.length} aberta={lixeiraAberta} onAlternar={() => setLixeiraAberta((valor) => !valor)} />
            <button type="button" onClick={onNovo} className={classeBotaoPrimario}>+ Novo pedido</button>
          </>
        }
      />

      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end">
        <CampoBusca valor={filtros.busca} onMudar={(busca) => alterar({ busca })} placeholder="Buscar cliente, produto, cores ou texto" />
        <select aria-label="Filtrar por situação" value={filtros.status} onChange={(event) => alterar({ status: event.target.value as FiltrosPedido["status"] })} className={`${classeCampo} lg:w-44`}>
          <option value="abertos">Em aberto</option>
          <option value="todos">Todos</option>
          {STATUS_PEDIDO.map((status) => (
            <option key={status} value={status}>{ROTULO_STATUS[status]}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2 lg:flex">
          <label className="text-xs text-stone-500">
            Entrega de
            <input type="date" value={filtros.de} onChange={(event) => alterar({ de: event.target.value })} className={classeCampo} />
          </label>
          <label className="text-xs text-stone-500">
            até
            <input type="date" value={filtros.ate} onChange={(event) => alterar({ ate: event.target.value })} className={classeCampo} />
          </label>
        </div>
        <select aria-label="Ordenar" value={filtros.ordem} onChange={(event) => alterar({ ordem: event.target.value as FiltrosPedido["ordem"] })} className={`${classeCampo} lg:w-52`}>
          <option value="entrega_asc">Entrega mais próxima</option>
          <option value="entrega_desc">Entrega mais distante</option>
        </select>
      </div>

      {(filtros.clienteId || filtros.somenteAtencao || filtrosAlterados) && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          {filtros.clienteId && (
            <button type="button" onClick={() => alterar({ clienteId: "" })} className={classeBotaoLinha}>
              Cliente: {nomes.cliente(filtros.clienteId)} ✕
            </button>
          )}
          {filtros.somenteAtencao && (
            <button type="button" onClick={() => alterar({ somenteAtencao: false })} className={classeBotaoLinha}>
              Só atrasados/urgentes ✕
            </button>
          )}
          {filtrosAlterados && (
            <button type="button" onClick={() => onFiltros(FILTROS_PEDIDO_PADRAO)} className="text-sm font-semibold text-stone-600 underline underline-offset-4">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {pedidos.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum pedido ainda"
          descricao="Crie o primeiro pedido. Dá para cadastrar o cliente no mesmo passo."
          acao={<button type="button" onClick={onNovo} className={classeBotaoPrimario}>+ Novo pedido</button>}
        />
      ) : visiveis.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum pedido encontrado"
          descricao="Nenhum pedido combina com a busca e os filtros escolhidos."
          acao={<button type="button" onClick={() => onFiltros(FILTROS_PEDIDO_PADRAO)} className={classeBotaoSecundario}>Limpar filtros</button>}
        />
      ) : (
        <>
          <p className="mb-2 text-xs text-stone-500">
            {visiveis.length} pedido(s) · total {formatarMoeda(total)}
          </p>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((pedido) => {
              const proximo = proximoStatus(pedido.status);
              const detalhes = [pedido.cores, pedido.texto_personalizacao].filter(Boolean).join(" · ");
              return (
                <li key={pedido.id} className="flex flex-col rounded-lg border border-stone-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-stone-900">{nomes.cliente(pedido.cliente_id)}</p>
                      <p className="text-sm text-stone-600">
                        {descreverItens(pedido.itens, nomes.produto)}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-stone-900">{formatarMoeda(pedido.valor_final)}</p>
                  </div>
                  {detalhes && (
                    <p className="mt-1 line-clamp-2 text-xs text-stone-500" title={detalhes}>{detalhes}</p>
                  )}
                  <p className="mt-3 text-sm text-stone-700">
                    Entrega: <strong>{formatarData(pedido.data_entrega)}</strong>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {pedidoAberto(pedido) && <SeloUrgencia urgencia={urgenciaDoPedido(pedido, hoje)} />}
                    <SeloStatus status={pedido.status} />
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    {proximo && (
                      <button type="button" onClick={() => onAvancar(pedido)} className={classeBotaoLinha}>
                        Avançar para {ROTULO_STATUS[proximo].toLowerCase()}
                      </button>
                    )}
                    <button type="button" onClick={() => onEditar(pedido.id)} className={classeBotaoLinha}>Editar</button>
                    <Link href={`/orcamento/${pedido.id}`} className={`${classeBotaoLinha} como-botao`}>Orçamento</Link>
                    <button type="button" onClick={() => onExcluir(pedido)} className={classeBotaoLinhaPerigo}>Excluir</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {lixeiraAberta && (
        <PainelLixeira
          titulo="Pedidos excluídos"
          itens={lixeira.map((pedido) => ({
            id: pedido.id,
            nome: `${nomes.cliente(pedido.cliente_id)} · ${descreverItens(pedido.itens, nomes.produto)}`,
            detalhe: `Entrega ${formatarData(pedido.data_entrega)} · ${formatarMoeda(pedido.valor_final)}`,
          }))}
          onRestaurar={onRestaurar}
          onFechar={() => setLixeiraAberta(false)}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Estoque

export function AbaEstoque({
  insumos,
  lixeira,
  filtros,
  onFiltros,
  usoPorInsumo,
  onNovo,
  onEditar,
  onExcluir,
  onRestaurar,
}: {
  insumos: InsumoComSituacao[];
  lixeira: Insumo[];
  filtros: FiltrosEstoque;
  onFiltros: (filtros: FiltrosEstoque) => void;
  usoPorInsumo: Map<string, number>;
  onNovo: () => void;
  onEditar: (id: string) => void;
  onExcluir: (insumo: Insumo) => void;
  onRestaurar: (id: string) => Promise<void>;
}) {
  const [lixeiraAberta, setLixeiraAberta] = useState(false);
  const visiveis = useMemo(
    () => filtrarInsumos(insumos, filtros).sort((a, b) => a.nome.localeCompare(b.nome)),
    [insumos, filtros],
  );
  const alterar = (parcial: Partial<FiltrosEstoque>) => onFiltros({ ...filtros, ...parcial });
  const filtrosAlterados = JSON.stringify(filtros) !== JSON.stringify(FILTROS_ESTOQUE_PADRAO);

  return (
    <section className={classePainel}>
      <CabecalhoSecao
        titulo="Estoque"
        descricao="Insumos com a unidade real de trabalho: folha, cm, metro, ml, unidade ou kg."
        acoes={
          <>
            <BotaoLixeira quantidade={lixeira.length} aberta={lixeiraAberta} onAlternar={() => setLixeiraAberta((valor) => !valor)} />
            <button type="button" onClick={onNovo} className={classeBotaoPrimario}>+ Novo insumo</button>
          </>
        }
      />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <CampoBusca valor={filtros.busca} onMudar={(busca) => alterar({ busca })} placeholder="Buscar insumo" />
        <select aria-label="Filtrar por categoria" value={filtros.categoria} onChange={(event) => alterar({ categoria: event.target.value })} className={`${classeCampo} sm:w-44`}>
          <option value="">Todas as categorias</option>
          {CATEGORIAS_INSUMO.map((categoria) => (
            <option key={categoria} value={categoria}>{categoria}</option>
          ))}
        </select>
        <select aria-label="Filtrar por situação" value={filtros.situacao} onChange={(event) => alterar({ situacao: event.target.value as FiltrosEstoque["situacao"] })} className={`${classeCampo} sm:w-48`}>
          <option value="todos">Todas as situações</option>
          <option value="alerta">Precisa comprar</option>
          <option value="critico">Crítico</option>
          <option value="baixo">Baixo</option>
          <option value="normal">Normal</option>
        </select>
      </div>

      {insumos.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum insumo cadastrado"
          descricao="Cadastre papéis, fitas, tintas e o que mais usa na produção."
          acao={<button type="button" onClick={onNovo} className={classeBotaoPrimario}>+ Novo insumo</button>}
        />
      ) : visiveis.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum insumo encontrado"
          acao={filtrosAlterados && <button type="button" onClick={() => onFiltros(FILTROS_ESTOQUE_PADRAO)} className={classeBotaoSecundario}>Limpar filtros</button>}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((insumo) => (
            <li key={insumo.id} className="flex flex-col rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-stone-900">{insumo.nome}</p>
                  <p className="text-xs text-stone-500">
                    {insumo.categoria ?? "Outros"}
                    {usoPorInsumo.get(insumo.id) ? ` · usado em ${usoPorInsumo.get(insumo.id)} produto(s)` : ""}
                  </p>
                </div>
                <SeloEstoque situacao={insumo.situacao} />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-stone-500">Em estoque</dt>
                  <dd className="font-semibold">{formatarQuantidade(insumo.quantidade_estoque, insumo.unidade)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Mínimo</dt>
                  <dd>{formatarQuantidade(insumo.quantidade_minima, insumo.unidade)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500">Valor unitário</dt>
                  <dd>{formatarCustoUnitario(insumo.custo_unitario)}/{insumo.unidade}</dd>
                </div>
              </dl>
              {insumo.reposicao > 0 && (
                <p className="mt-3 rounded-md bg-amber-50 px-2 py-1.5 text-sm font-medium text-amber-900">
                  Reposição: comprar {formatarQuantidade(insumo.reposicao, insumo.unidade)}
                </p>
              )}
              <div className="mt-auto flex gap-2 pt-4">
                <button type="button" onClick={() => onEditar(insumo.id)} className={classeBotaoLinha}>Editar</button>
                <button type="button" onClick={() => onExcluir(insumo)} className={classeBotaoLinhaPerigo}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {lixeiraAberta && (
        <PainelLixeira
          titulo="Insumos excluídos"
          itens={lixeira.map((insumo) => ({
            id: insumo.id,
            nome: insumo.nome,
            detalhe: `${formatarQuantidade(insumo.quantidade_estoque, insumo.unidade)} · ${formatarCustoUnitario(insumo.custo_unitario)} / ${insumo.unidade}`,
          }))}
          onRestaurar={onRestaurar}
          onFechar={() => setLixeiraAberta(false)}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Produtos

export function AbaProdutos({
  produtos,
  configuracoes,
  lixeira,
  pedidosAbertosPorProduto,
  onNovo,
  onEditar,
  onExcluir,
  onRestaurar,
}: {
  produtos: ProdutoComDetalhe[];
  configuracoes: Configuracoes;
  lixeira: Produto[];
  pedidosAbertosPorProduto: Map<string, number>;
  onNovo: () => void;
  onEditar: (id: string) => void;
  onExcluir: (produto: Produto) => void;
  onRestaurar: (id: string) => Promise<void>;
}) {
  const [busca, setBusca] = useState("");
  const [lixeiraAberta, setLixeiraAberta] = useState(false);
  const visiveis = produtos
    .filter((produto) => !busca.trim() || contem(produto.nome, busca))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <section className={classePainel}>
      <CabecalhoSecao
        titulo="Produtos"
        descricao="Custo = insumos + mão de obra + perdas + custos fixos. Mudou um custo ou uma configuração? O preço atualiza na hora."
        acoes={
          <>
            <BotaoLixeira quantidade={lixeira.length} aberta={lixeiraAberta} onAlternar={() => setLixeiraAberta((valor) => !valor)} />
            <button type="button" onClick={onNovo} className={classeBotaoPrimario}>+ Novo produto</button>
          </>
        }
      />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <CampoBusca valor={busca} onMudar={setBusca} placeholder="Buscar produto" />
        <p className="text-xs text-stone-500 sm:max-w-sm">
          Hora {formatarMoeda(configuracoes.valor_hora_trabalho)} · perdas {configuracoes.percentual_perdas}% · fixos{" "}
          {configuracoes.percentual_custos_fixos}% ·{" "}
          <Link href="/configuracoes" className="font-semibold text-stone-700 underline underline-offset-2">alterar</Link>
        </p>
      </div>

      {produtos.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum produto cadastrado"
          descricao="Monte um produto escolhendo os insumos e a margem. O preço sugerido é calculado sozinho."
          acao={<button type="button" onClick={onNovo} className={classeBotaoPrimario}>+ Novo produto</button>}
        />
      ) : visiveis.length === 0 ? (
        <EstadoVazio titulo="Nenhum produto encontrado" acao={<button type="button" onClick={() => setBusca("")} className={classeBotaoSecundario}>Limpar busca</button>} />
      ) : (
        <ul className="space-y-3">
          {visiveis.map((produto) => {
            const { detalhe } = produto;
            const abertos = pedidosAbertosPorProduto.get(produto.id) ?? 0;
            return (
              <li key={produto.id} className={`rounded-lg border p-4 ${detalhe.insumosComProblema.length > 0 ? "border-red-200" : "border-stone-200"}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-stone-900">{produto.nome}</p>
                      {abertos > 0 && <Selo tom="cinza">{abertos} pedido(s) em aberto</Selo>}
                      {detalhe.insumosComProblema.length > 0 && <Selo tom="vermelho" icone="⚠">Insumo removido</Selo>}
                    </div>
                    {detalhe.linhas.length === 0 ? (
                      <p className="mt-1 text-sm text-amber-700">Sem insumos: o custo está zerado.</p>
                    ) : (
                      <ul className="mt-2 space-y-0.5 text-sm text-stone-600">
                        {detalhe.linhas.map((linha, indice) => (
                          <li key={`${linha.insumo_id}-${indice}`} className={linha.situacao === "ok" ? "" : "font-semibold text-red-700"}>
                            {linha.situacao === "ok"
                              ? `${formatarQuantidade(linha.quantidade, linha.unidade)} de ${linha.nome} — ${formatarMoeda(linha.custoTotal)}`
                              : `${linha.nome}: ${linha.situacao === "removido" ? "está na lixeira" : "não existe mais"} (não entra no custo)`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-3 md:items-end">
                    <dl className="min-w-60 text-sm">
                      {[
                        ["Insumos", detalhe.custoInsumos],
                        [`Mão de obra (${produto.tempo_producao_minutos ?? 0} min)`, detalhe.custoMaoObra],
                        ["Perdas", detalhe.custoComPerdas - detalhe.custoBase],
                        ["Custos fixos", detalhe.custoTotal - detalhe.custoComPerdas],
                      ].map(([rotulo, valor]) => (
                        <div key={rotulo} className="flex justify-between gap-4 text-stone-600">
                          <dt>{rotulo}</dt>
                          <dd>{formatarMoeda(valor as number)}</dd>
                        </div>
                      ))}
                      <div className="flex justify-between gap-4 border-t border-stone-200 pt-1 font-semibold">
                        <dt>Custo total</dt>
                        <dd>{formatarMoeda(detalhe.custoTotal)}</dd>
                      </div>
                      <div className="flex justify-between gap-4 text-stone-600">
                        <dt>Margem</dt>
                        <dd>{produto.margem_desejada}%</dd>
                      </div>
                      <div className="flex justify-between gap-4 text-base font-black text-stone-900">
                        <dt>Preço sugerido</dt>
                        <dd>{formatarMoeda(detalhe.precoSugerido)}</dd>
                      </div>
                    </dl>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => onEditar(produto.id)} className={classeBotaoLinha}>Editar</button>
                      <button type="button" onClick={() => onExcluir(produto)} className={classeBotaoLinhaPerigo}>Excluir</button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {lixeiraAberta && (
        <PainelLixeira
          titulo="Produtos excluídos"
          itens={lixeira.map((produto) => ({ id: produto.id, nome: produto.nome, detalhe: `Margem ${produto.margem_desejada}%` }))}
          onRestaurar={onRestaurar}
          onFechar={() => setLixeiraAberta(false)}
        />
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Clientes

export function AbaClientes({
  resumos,
  lixeira,
  onNovo,
  onEditar,
  onExcluir,
  onRestaurar,
  onVerPedidos,
  onNovoPedido,
}: {
  resumos: ResumoCliente[];
  lixeira: Cliente[];
  onNovo: () => void;
  onEditar: (id: string) => void;
  onExcluir: (cliente: Cliente) => void;
  onRestaurar: (id: string) => Promise<void>;
  onVerPedidos: (id: string) => void;
  onNovoPedido: (id: string) => void;
}) {
  const [busca, setBusca] = useState("");
  const [lixeiraAberta, setLixeiraAberta] = useState(false);
  const visiveis = resumos
    .filter(({ cliente }) => !busca.trim() || contem(`${cliente.nome} ${cliente.contato}`, busca))
    .sort((a, b) => a.cliente.nome.localeCompare(b.cliente.nome));

  return (
    <section className={classePainel}>
      <CabecalhoSecao
        titulo="Clientes"
        acoes={
          <>
            <BotaoLixeira quantidade={lixeira.length} aberta={lixeiraAberta} onAlternar={() => setLixeiraAberta((valor) => !valor)} />
            <button type="button" onClick={onNovo} className={classeBotaoPrimario}>+ Novo cliente</button>
          </>
        }
      />

      <div className="mb-3 flex">
        <CampoBusca valor={busca} onMudar={setBusca} placeholder="Buscar por nome ou contato" />
      </div>

      {resumos.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum cliente cadastrado"
          acao={<button type="button" onClick={onNovo} className={classeBotaoPrimario}>+ Novo cliente</button>}
        />
      ) : visiveis.length === 0 ? (
        <EstadoVazio titulo="Nenhum cliente encontrado" acao={<button type="button" onClick={() => setBusca("")} className={classeBotaoSecundario}>Limpar busca</button>} />
      ) : (
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
          {visiveis.map(({ cliente, totalPedidos, pedidosAbertos, ultimoPedido }) => (
            <li key={cliente.id} className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-stone-900">{cliente.nome}</p>
                <p className="text-sm text-stone-600">{cliente.contato}</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {totalPedidos === 0
                    ? "Nenhum pedido ainda"
                    : `${totalPedidos} pedido(s)${pedidosAbertos ? `, ${pedidosAbertos} em aberto` : ""} · último com entrega em ${formatarData(ultimoPedido!.data_entrega)}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onNovoPedido(cliente.id)} className={classeBotaoLinha}>Novo pedido</button>
                <button type="button" onClick={() => onVerPedidos(cliente.id)} disabled={totalPedidos === 0} className={classeBotaoLinha}>Ver pedidos</button>
                <button type="button" onClick={() => onEditar(cliente.id)} className={classeBotaoLinha}>Editar</button>
                <button type="button" onClick={() => onExcluir(cliente)} className={classeBotaoLinhaPerigo}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {lixeiraAberta && (
        <PainelLixeira
          titulo="Clientes excluídos"
          itens={lixeira.map((cliente) => ({ id: cliente.id, nome: cliente.nome, detalhe: cliente.contato }))}
          onRestaurar={onRestaurar}
          onFechar={() => setLixeiraAberta(false)}
        />
      )}
    </section>
  );
}
