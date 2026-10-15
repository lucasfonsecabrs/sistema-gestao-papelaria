"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { chamarApi, type RespostaApi } from "@/lib/cliente-api";
import { formatarData, proximoStatus, ROTULO_STATUS } from "@/lib/pedidos";
import { CONFIGURACOES_PADRAO, type Configuracoes } from "@/lib/precificacao";
import type { Registros, Tabela } from "@/lib/repositorio";
import type { Cliente, Insumo, Pedido, Produto } from "@/lib/store";
import {
  detalharProdutos,
  FILTROS_ESTOQUE_PADRAO,
  FILTROS_PEDIDO_PADRAO,
  pedidoAberto,
  resumirClientes,
  resumirPainel,
  situacaoInsumos,
  type FiltrosEstoque,
  type FiltrosPedido,
} from "@/lib/visao";

import { AbaClientes, AbaEstoque, AbaPainel, AbaPedidos, AbaProdutos, type Nomes } from "./components/abas";
import {
  FormularioCliente,
  FormularioInsumo,
  FormularioPedido,
  FormularioProduto,
} from "./components/formularios";
import {
  Avisos,
  classeBotaoPrimario,
  classeBotaoSecundario,
  DialogoConfirmacao,
  Modal,
  type Aviso,
  type Confirmacao,
} from "./components/ui";

type Colecoes = { [T in Tabela]: Registros[T][] };

const VAZIO: Colecoes = { clientes: [], insumos: [], produtos: [], pedidos: [] };
const TABELAS: Tabela[] = ["clientes", "insumos", "produtos", "pedidos"];

const ROTULO_TABELA: Record<Tabela, string> = {
  clientes: "Cliente",
  insumos: "Insumo",
  produtos: "Produto",
  pedidos: "Pedido",
};

type Aba = "painel" | "pedidos" | "estoque" | "produtos" | "clientes";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "painel", rotulo: "Painel" },
  { id: "pedidos", rotulo: "Pedidos" },
  { id: "estoque", rotulo: "Estoque" },
  { id: "produtos", rotulo: "Produtos" },
  { id: "clientes", rotulo: "Clientes" },
];

type ModalAberto =
  | { tipo: "pedido"; id?: string; clienteId?: string }
  | { tipo: "cliente"; id?: string }
  | { tipo: "insumo"; id?: string }
  | { tipo: "produto"; id?: string };

function substituir<T extends { id: string }>(lista: T[], registro: T): T[] {
  return lista.some((item) => item.id === registro.id)
    ? lista.map((item) => (item.id === registro.id ? registro : item))
    : [registro, ...lista];
}

type Carga =
  | { ok: true; ativos: Colecoes; lixeira: Colecoes; configuracoes: Configuracoes }
  | { ok: false; erro: string };

async function buscarColecoes(): Promise<Carga> {
  const configuracoes = await chamarApi<Configuracoes>("/api/configuracoes");

  if (!configuracoes.ok) return { ok: false, erro: configuracoes.erro };

  const respostas = await Promise.all(
    TABELAS.map((tabela) =>
      Promise.all([
        chamarApi<Registros[typeof tabela][]>(`/api/${tabela}`),
        chamarApi<Registros[typeof tabela][]>(`/api/${tabela}?lixeira=true`),
      ]),
    ),
  );
  const ativos = { ...VAZIO };
  const lixeira = { ...VAZIO };

  for (const [indice, tabela] of TABELAS.entries()) {
    const [listaAtivos, listaLixeira] = respostas[indice];

    if (!listaAtivos.ok) return { ok: false, erro: listaAtivos.erro };
    if (!listaLixeira.ok) return { ok: false, erro: listaLixeira.erro };

    Object.assign(ativos, { [tabela]: listaAtivos.dados });
    Object.assign(lixeira, { [tabela]: listaLixeira.dados });
  }

  return { ok: true, ativos, lixeira, configuracoes: configuracoes.dados };
}

export default function Home() {
  const [ativos, setAtivos] = useState<Colecoes>(VAZIO);
  const [lixeira, setLixeira] = useState<Colecoes>(VAZIO);
  const [configuracoes, setConfiguracoes] = useState<Configuracoes>(CONFIGURACOES_PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [hoje] = useState(() => new Date());

  const [aba, setAba] = useState<Aba>("painel");
  const [modal, setModal] = useState<ModalAberto | null>(null);
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [filtrosPedido, setFiltrosPedido] = useState<FiltrosPedido>(FILTROS_PEDIDO_PADRAO);
  const [filtrosEstoque, setFiltrosEstoque] = useState<FiltrosEstoque>(FILTROS_ESTOQUE_PADRAO);
  const proximoAviso = useRef(0);

  // ------------------------------------------------------------ dados

  const aplicarCarga = useCallback((resultado: Carga) => {
    if (resultado.ok) {
      setAtivos(resultado.ativos);
      setLixeira(resultado.lixeira);
      setConfiguracoes(resultado.configuracoes);
      setErroCarga(null);
    } else {
      setErroCarga(resultado.erro);
    }

    setCarregando(false);
  }, []);

  useEffect(() => {
    let ativo = true;
    void buscarColecoes().then((resultado) => {
      if (ativo) aplicarCarga(resultado);
    });
    return () => {
      ativo = false;
    };
  }, [aplicarCarga]);

  const fecharAviso = useCallback((id: number) => {
    setAvisos((atual) => atual.filter((aviso) => aviso.id !== id));
  }, []);

  const avisar = useCallback(
    (tipo: Aviso["tipo"], texto: string, acao?: Aviso["acao"]) => {
      const id = ++proximoAviso.current;
      setAvisos((atual) => [...atual.slice(-2), { id, tipo, texto, acao }]);
      window.setTimeout(() => fecharAviso(id), acao ? 8000 : 4500);
    },
    [fecharAviso],
  );

  const guardar = <T extends Tabela>(tabela: T, registro: Registros[T]) => {
    setAtivos((atual) => ({ ...atual, [tabela]: substituir(atual[tabela] as Registros[T][], registro) }));
  };

  async function salvar<T extends Tabela>(
    tabela: T,
    dados: Record<string, unknown>,
    id?: string,
  ): Promise<RespostaApi<Registros[T]>> {
    const resposta = await chamarApi<Registros[T]>(`/api/${tabela}`, id ? "PUT" : "POST", id ? { ...dados, id } : dados);

    if (resposta.ok) {
      guardar(tabela, resposta.dados);
    }

    return resposta;
  }

  // Wraps a form save: on success close the modal and confirm; on failure the
  // form keeps its data and shows the returned error inline.
  async function salvarDoFormulario<T extends Tabela>(
    tabela: T,
    dados: Record<string, unknown>,
    id: string | undefined,
    mensagem: string,
  ) {
    const resposta = await salvar(tabela, dados, id);

    if (resposta.ok) {
      setModal(null);
      avisar("sucesso", mensagem);
    }

    return resposta;
  }

  async function restaurar(tabela: Tabela, id: string) {
    const resposta = await chamarApi<Registros[typeof tabela]>(`/api/${tabela}`, "POST", { acao: "restaurar", id });

    if (!resposta.ok) {
      avisar("erro", resposta.erro);
      return;
    }

    guardar(tabela, resposta.dados);
    setLixeira((atual) => ({ ...atual, [tabela]: (atual[tabela] as { id: string }[]).filter((item) => item.id !== id) }));
    // A pending "Desfazer" would now restore something already restored.
    setAvisos((atual) => atual.filter((aviso) => !aviso.acao));
    avisar("sucesso", `${ROTULO_TABELA[tabela]} restaurado.`);
  }

  async function excluir(tabela: Tabela, id: string) {
    const resposta = await chamarApi(`/api/${tabela}?id=${encodeURIComponent(id)}`, "DELETE");
    setConfirmacao(null);

    if (!resposta.ok) {
      avisar("erro", resposta.erro);
      return;
    }

    const removido = (ativos[tabela] as { id: string }[]).find((item) => item.id === id);
    setAtivos((atual) => ({ ...atual, [tabela]: (atual[tabela] as { id: string }[]).filter((item) => item.id !== id) }));

    if (removido) {
      setLixeira((atual) => ({ ...atual, [tabela]: [removido, ...(atual[tabela] as { id: string }[])] }));
    }

    avisar("sucesso", `${ROTULO_TABELA[tabela]} movido para a lixeira.`, {
      rotulo: "Desfazer",
      executar: () => void restaurar(tabela, id),
    });
  }

  async function avancarPedido(pedido: Pedido) {
    const proximo = proximoStatus(pedido.status);
    if (!proximo) return;

    const resposta = await salvar("pedidos", { status: proximo }, pedido.id);

    if (resposta.ok) {
      avisar("sucesso", `Pedido marcado como ${ROTULO_STATUS[proximo].toLowerCase()}.`);
    } else {
      avisar("erro", resposta.erro);
    }
  }

  // ------------------------------------------------------------ derivados

  const nomes = useMemo<Nomes>(() => {
    const clientes = new Map([...lixeira.clientes, ...ativos.clientes].map((item) => [item.id, item.nome]));
    const produtos = new Map([...lixeira.produtos, ...ativos.produtos].map((item) => [item.id, item.nome]));
    const clientesRemovidos = new Set(lixeira.clientes.map((item) => item.id));
    const produtosRemovidos = new Set(lixeira.produtos.map((item) => item.id));

    return {
      cliente: (id) =>
        `${clientes.get(id) ?? "Cliente não encontrado"}${clientesRemovidos.has(id) ? " (na lixeira)" : ""}`,
      produto: (id) =>
        `${produtos.get(id) ?? "Produto não encontrado"}${produtosRemovidos.has(id) ? " (na lixeira)" : ""}`,
    };
  }, [ativos.clientes, ativos.produtos, lixeira.clientes, lixeira.produtos]);

  const insumosComSituacao = useMemo(() => situacaoInsumos(ativos.insumos), [ativos.insumos]);
  const produtosDetalhados = useMemo(
    () => detalharProdutos(ativos.produtos, ativos.insumos, lixeira.insumos, configuracoes),
    [ativos.produtos, ativos.insumos, lixeira.insumos, configuracoes],
  );
  const resumo = useMemo(
    () => resumirPainel(ativos.pedidos, produtosDetalhados, insumosComSituacao, hoje),
    [ativos.pedidos, produtosDetalhados, insumosComSituacao, hoje],
  );
  const resumosClientes = useMemo(
    () => resumirClientes(ativos.clientes, ativos.pedidos),
    [ativos.clientes, ativos.pedidos],
  );

  const usoPorInsumo = useMemo(() => {
    const uso = new Map<string, number>();
    for (const produto of ativos.produtos) {
      for (const id of new Set(produto.insumos.map((item) => item.insumo_id))) {
        uso.set(id, (uso.get(id) ?? 0) + 1);
      }
    }
    return uso;
  }, [ativos.produtos]);

  const pedidosAbertosPorProduto = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const pedido of ativos.pedidos.filter(pedidoAberto)) {
      contagem.set(pedido.produto_id, (contagem.get(pedido.produto_id) ?? 0) + 1);
    }
    return contagem;
  }, [ativos.pedidos]);

  // ------------------------------------------------------------ ações

  const confirmarExclusaoPedido = (pedido: Pedido) =>
    setConfirmacao({
      titulo: "Excluir pedido?",
      mensagem: (
        <p>
          O pedido de <strong>{nomes.cliente(pedido.cliente_id)}</strong> ({pedido.quantidade}× {nomes.produto(pedido.produto_id)},
          entrega {formatarData(pedido.data_entrega)}) vai para a lixeira e pode ser restaurado.
        </p>
      ),
      rotulo: "Mover para a lixeira",
      executar: () => excluir("pedidos", pedido.id),
    });

  const confirmarExclusaoInsumo = (insumo: Insumo) => {
    const uso = usoPorInsumo.get(insumo.id) ?? 0;
    setConfirmacao({
      titulo: "Excluir insumo?",
      mensagem: (
        <>
          <p><strong>{insumo.nome}</strong> vai para a lixeira e pode ser restaurado.</p>
          {uso > 0 && (
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900">
              Ele é usado em {uso} produto(s). Enquanto estiver na lixeira, esses produtos ficam com o custo incompleto e aparecem com alerta.
            </p>
          )}
        </>
      ),
      rotulo: "Mover para a lixeira",
      executar: () => excluir("insumos", insumo.id),
    });
  };

  const confirmarExclusaoProduto = (produto: Produto) => {
    const abertos = pedidosAbertosPorProduto.get(produto.id) ?? 0;
    setConfirmacao({
      titulo: "Excluir produto?",
      mensagem: (
        <>
          <p><strong>{produto.nome}</strong> vai para a lixeira e deixa de aparecer em novos pedidos.</p>
          {abertos > 0 && (
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900">
              Há {abertos} pedido(s) em aberto com este produto. Eles continuam existindo normalmente.
            </p>
          )}
        </>
      ),
      rotulo: "Mover para a lixeira",
      executar: () => excluir("produtos", produto.id),
    });
  };

  const confirmarExclusaoCliente = (cliente: Cliente) => {
    const resumoCliente = resumosClientes.find((item) => item.cliente.id === cliente.id);
    setConfirmacao({
      titulo: "Excluir cliente?",
      mensagem: (
        <>
          <p><strong>{cliente.nome}</strong> vai para a lixeira e pode ser restaurado.</p>
          {resumoCliente && resumoCliente.totalPedidos > 0 && (
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900">
              Os {resumoCliente.totalPedidos} pedido(s) deste cliente são mantidos.
            </p>
          )}
        </>
      ),
      rotulo: "Mover para a lixeira",
      executar: () => excluir("clientes", cliente.id),
    });
  };

  const abrirNovo = (tipo: ModalAberto["tipo"]) => setModal({ tipo });

  const verPedidos = (filtros: Partial<FiltrosPedido>) => {
    setFiltrosPedido({ ...FILTROS_PEDIDO_PADRAO, ...filtros });
    setAba("pedidos");
  };

  // ------------------------------------------------------------ modal

  const fecharModal = () => setModal(null);

  const tituloModal = modal
    ? `${modal.id ? "Editar" : "Novo"} ${ROTULO_TABELA[`${modal.tipo}s` as Tabela].toLowerCase()}`
    : "";

  const conteudoModal = () => {
    if (!modal) return null;

    switch (modal.tipo) {
      case "pedido": {
        const pedido = ativos.pedidos.find((item) => item.id === modal.id);
        return (
          <FormularioPedido
            pedido={pedido}
            clienteInicialId={modal.clienteId}
            clientes={ativos.clientes}
            clientesRemovidos={lixeira.clientes}
            produtos={produtosDetalhados}
            produtosRemovidos={lixeira.produtos}
            hoje={hoje}
            onCriarCliente={async (dados) => {
              const resposta = await salvar("clientes", dados);
              if (resposta.ok) avisar("sucesso", `Cliente ${resposta.dados.nome} cadastrado.`);
              return resposta;
            }}
            onSalvar={(dados) =>
              salvarDoFormulario("pedidos", dados, pedido?.id, pedido ? "Pedido atualizado." : "Pedido criado.")
            }
            onCancelar={fecharModal}
          />
        );
      }
      case "cliente": {
        const cliente = ativos.clientes.find((item) => item.id === modal.id);
        return (
          <FormularioCliente
            cliente={cliente}
            onSalvar={(dados) =>
              salvarDoFormulario("clientes", dados, cliente?.id, cliente ? "Cliente atualizado." : "Cliente cadastrado.")
            }
            onCancelar={fecharModal}
          />
        );
      }
      case "insumo": {
        const insumo = ativos.insumos.find((item) => item.id === modal.id);
        return (
          <FormularioInsumo
            insumo={insumo}
            produtosQueUsam={insumo ? usoPorInsumo.get(insumo.id) ?? 0 : 0}
            onSalvar={(dados) =>
              salvarDoFormulario("insumos", dados, insumo?.id, insumo ? "Insumo atualizado." : "Insumo cadastrado.")
            }
            onCancelar={fecharModal}
          />
        );
      }
      case "produto": {
        const produto = ativos.produtos.find((item) => item.id === modal.id);
        return (
          <FormularioProduto
            produto={produto}
            insumos={ativos.insumos}
            insumosRemovidos={lixeira.insumos}
            configuracoes={configuracoes}
            onSalvar={(dados) =>
              salvarDoFormulario("produtos", dados, produto?.id, produto ? "Produto atualizado." : "Produto cadastrado.")
            }
            onCancelar={fecharModal}
          />
        );
      }
    }
  };

  // ------------------------------------------------------------ tela

  return (
    <main className="min-h-screen bg-[#eef2f6] px-4 py-5 text-stone-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.04)] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.jpg"
              alt="Malô Papelaria Personalizada"
              width={160}
              height={160}
              priority
              className="h-16 w-16 rounded-xl object-cover sm:h-20 sm:w-20"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">Malô Personalizados</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-900">Gestão do ateliê</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/configuracoes" className={classeBotaoSecundario}>
              Configurações
            </Link>
            <button type="button" onClick={() => abrirNovo("pedido")} className={`flex-1 ${classeBotaoPrimario}`} disabled={carregando || Boolean(erroCarga)}>
              + Novo pedido
            </button>
          </div>
        </header>

        <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-white p-1.5" aria-label="Seções">
          {ABAS.map((item) => {
            const contador =
              item.id === "pedidos" ? resumo.atencao.length : item.id === "estoque" ? resumo.alertasEstoque.length : 0;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={aba === item.id ? "page" : undefined}
                onClick={() => setAba(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  aba === item.id ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                {item.rotulo}
                {contador > 0 && (
                  <span className={`rounded-full px-1.5 text-[11px] ${aba === item.id ? "bg-white text-stone-900" : "bg-orange-100 text-orange-800"}`}>
                    {contador}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {carregando ? (
          <p className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-500">Carregando…</p>
        ) : erroCarga ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
            <p className="font-semibold">Não foi possível carregar os dados.</p>
            <p className="mt-1 text-sm">{erroCarga}</p>
            <button
              type="button"
              onClick={() => {
                setCarregando(true);
                void buscarColecoes().then(aplicarCarga);
              }}
              className={`mt-4 ${classeBotaoPrimario}`}
            >
              Tentar de novo
            </button>
          </div>
        ) : (
          <>
            {aba === "painel" && (
              <AbaPainel
                resumo={resumo}
                nomes={nomes}
                hoje={hoje}
                onVerPedidos={verPedidos}
                onVerEstoque={(filtros) => {
                  setFiltrosEstoque({ ...FILTROS_ESTOQUE_PADRAO, ...filtros });
                  setAba("estoque");
                }}
                onVerProdutos={() => setAba("produtos")}
                onNovo={abrirNovo}
                onEditarPedido={(id) => setModal({ tipo: "pedido", id })}
                onAvancarPedido={avancarPedido}
              />
            )}
            {aba === "pedidos" && (
              <AbaPedidos
                pedidos={ativos.pedidos}
                lixeira={lixeira.pedidos}
                filtros={filtrosPedido}
                onFiltros={setFiltrosPedido}
                nomes={nomes}
                hoje={hoje}
                onNovo={() => abrirNovo("pedido")}
                onEditar={(id) => setModal({ tipo: "pedido", id })}
                onExcluir={confirmarExclusaoPedido}
                onAvancar={avancarPedido}
                onRestaurar={(id) => restaurar("pedidos", id)}
              />
            )}
            {aba === "estoque" && (
              <AbaEstoque
                insumos={insumosComSituacao}
                lixeira={lixeira.insumos}
                filtros={filtrosEstoque}
                onFiltros={setFiltrosEstoque}
                usoPorInsumo={usoPorInsumo}
                onNovo={() => abrirNovo("insumo")}
                onEditar={(id) => setModal({ tipo: "insumo", id })}
                onExcluir={confirmarExclusaoInsumo}
                onRestaurar={(id) => restaurar("insumos", id)}
              />
            )}
            {aba === "produtos" && (
              <AbaProdutos
                produtos={produtosDetalhados}
                configuracoes={configuracoes}
                lixeira={lixeira.produtos}
                pedidosAbertosPorProduto={pedidosAbertosPorProduto}
                onNovo={() => abrirNovo("produto")}
                onEditar={(id) => setModal({ tipo: "produto", id })}
                onExcluir={confirmarExclusaoProduto}
                onRestaurar={(id) => restaurar("produtos", id)}
              />
            )}
            {aba === "clientes" && (
              <AbaClientes
                resumos={resumosClientes}
                lixeira={lixeira.clientes}
                onNovo={() => abrirNovo("cliente")}
                onEditar={(id) => setModal({ tipo: "cliente", id })}
                onExcluir={confirmarExclusaoCliente}
                onRestaurar={(id) => restaurar("clientes", id)}
                onVerPedidos={(id) => verPedidos({ clienteId: id, status: "todos" })}
                onNovoPedido={(id) => setModal({ tipo: "pedido", clienteId: id })}
              />
            )}
          </>
        )}
      </div>

      {modal && (
        <Modal key={`${modal.tipo}-${modal.id ?? "novo"}`} titulo={tituloModal} onFechar={fecharModal}>
          {conteudoModal()}
        </Modal>
      )}

      {confirmacao && <DialogoConfirmacao confirmacao={confirmacao} onCancelar={() => setConfirmacao(null)} />}

      <Avisos avisos={avisos} onFechar={fecharAviso} />
    </main>
  );
}
