"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { chamarApi } from "@/lib/cliente-api";
import { montarOrcamento, VALIDADE_ORCAMENTO_DIAS, type Orcamento } from "@/lib/orcamento";
import { formatarData } from "@/lib/pedidos";
import type { Configuracoes } from "@/lib/precificacao";
import type { Cliente, Insumo, Pedido, Produto } from "@/lib/store";

import { classeBotaoPrimario, classeBotaoSecundario, formatarMoeda, MensagemErro } from "../../components/ui";

async function carregar(id: string): Promise<{ ok: true; orcamento: Orcamento } | { ok: false; erro: string }> {
  const [pedidos, produtos, produtosRemovidos, insumos, clientes, clientesRemovidos, configuracoes] = await Promise.all([
    chamarApi<Pedido[]>("/api/pedidos"),
    chamarApi<Produto[]>("/api/produtos"),
    chamarApi<Produto[]>("/api/produtos?lixeira=true"),
    chamarApi<Insumo[]>("/api/insumos"),
    chamarApi<Cliente[]>("/api/clientes"),
    chamarApi<Cliente[]>("/api/clientes?lixeira=true"),
    chamarApi<Configuracoes>("/api/configuracoes"),
  ]);
  if (!pedidos.ok || !produtos.ok || !produtosRemovidos.ok || !insumos.ok || !clientes.ok || !clientesRemovidos.ok || !configuracoes.ok) {
    return { ok: false, erro: "Não foi possível carregar o orçamento. Tente novamente." };
  }

  const pedido = pedidos.dados.find((item) => item.id === id);
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };

  return {
    ok: true,
    orcamento: montarOrcamento(pedido, {
      produtos: [...produtosRemovidos.dados, ...produtos.dados],
      insumos: insumos.dados,
      clientes: [...clientesRemovidos.dados, ...clientes.dados],
      configuracoes: configuracoes.dados,
    }),
  };
}

export default function PaginaOrcamento() {
  const { id } = useParams<{ id: string }>();
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void carregar(id).then((resultado) => {
      if (!ativo) return;
      if (resultado.ok) {
        setOrcamento(resultado.orcamento);
        // vira o nome sugerido do arquivo ao salvar em PDF
        document.title = `Orçamento ${resultado.orcamento.numero} - ${resultado.orcamento.cliente?.nome ?? "cliente"}`;
      } else setErro(resultado.erro);
    });
    return () => {
      ativo = false;
    };
  }, [id]);

  return (
    <main className="min-h-screen bg-[#eef2f6] px-4 py-5 text-stone-800 print:bg-white print:p-0 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <Link href="/" className={classeBotaoSecundario}>← Voltar</Link>
          <button type="button" onClick={() => window.print()} disabled={!orcamento} className={classeBotaoPrimario}>
            Salvar em PDF ou imprimir
          </button>
        </div>

        <MensagemErro mensagem={erro} />
        {!orcamento && !erro && <p className="text-sm text-stone-600">Carregando orçamento…</p>}

        {orcamento && (
          <article className="rounded-xl border border-stone-200 bg-white p-6 shadow-[0_2px_10px_rgba(15,23,42,0.04)] print:border-0 print:p-0 print:shadow-none md:p-10">
            <header className="flex flex-col gap-4 border-b border-stone-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Image src="/logo.jpg" alt="Malô Papelaria Personalizada" width={120} height={120} priority className="h-16 w-16 rounded-xl object-cover" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">Malô Personalizados</p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-900">Orçamento</h1>
                </div>
              </div>
              <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm sm:text-right">
                <dt className="text-stone-500">Número</dt>
                <dd className="font-semibold text-stone-900">{orcamento.numero}</dd>
                <dt className="text-stone-500">Emissão</dt>
                <dd className="font-semibold text-stone-900">{formatarData(orcamento.emissao)}</dd>
                <dt className="text-stone-500">Válido até</dt>
                <dd className="font-semibold text-stone-900">{formatarData(orcamento.validade)}</dd>
              </dl>
            </header>

            <section className="grid gap-4 border-b border-stone-200 py-6 sm:grid-cols-2">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Cliente</h2>
                <p className="mt-1 font-semibold text-stone-900">{orcamento.cliente?.nome ?? "Cliente não encontrado"}</p>
                {orcamento.cliente && <p className="text-sm text-stone-600">{orcamento.cliente.contato}</p>}
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Entrega prevista</h2>
                <p className="mt-1 font-semibold text-stone-900">{formatarData(orcamento.dataEntrega)}</p>
              </div>
            </section>

            <table className="mt-6 w-full text-sm">
              <caption className="sr-only">Itens do orçamento</caption>
              <thead>
                <tr className="border-b border-stone-300 text-left text-stone-500">
                  <th scope="col" className="py-2 font-semibold">Produto</th>
                  <th scope="col" className="py-2 text-right font-semibold">Qtd.</th>
                  <th scope="col" className="py-2 text-right font-semibold">Valor unitário</th>
                  <th scope="col" className="py-2 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {orcamento.linhas.map((linha, indice) => (
                  <tr key={indice} className="border-b border-stone-200">
                    <td className="py-3 font-medium text-stone-900">{linha.produto}</td>
                    <td className="py-3 text-right">{linha.quantidade}</td>
                    <td className="py-3 text-right">{formatarMoeda(linha.valorUnitario)}</td>
                    <td className="py-3 text-right font-semibold">{formatarMoeda(linha.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={3} className="pt-4 text-right text-base font-bold text-stone-900">Total</th>
                  <td className="pt-4 text-right text-xl font-black text-stone-900">{formatarMoeda(orcamento.total)}</td>
                </tr>
              </tfoot>
            </table>

            {(orcamento.cores || orcamento.textoPersonalizacao) && (
              <section className="mt-8 rounded-lg bg-stone-50 p-4 text-sm">
                <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Personalização</h2>
                {orcamento.cores && <p className="mt-2"><strong>Cores:</strong> {orcamento.cores}</p>}
                {orcamento.textoPersonalizacao && <p className="mt-1"><strong>Texto:</strong> {orcamento.textoPersonalizacao}</p>}
              </section>
            )}

            <p className="mt-8 text-xs text-stone-500">
              Orçamento válido por {VALIDADE_ORCAMENTO_DIAS} dias a partir da data de emissão. Valores calculados pelo sistema de gestão do ateliê.
            </p>
          </article>
        )}
      </div>
    </main>
  );
}
