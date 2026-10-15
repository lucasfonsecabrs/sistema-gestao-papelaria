"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { chamarApi } from "@/lib/cliente-api";
import { calcularPrecificacao, type Configuracoes } from "@/lib/precificacao";

import {
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeCampo,
  classePainel,
  classeRotulo,
  formatarMoeda,
  MensagemErro,
} from "../components/ui";

type Formulario = Record<keyof Configuracoes, string>;

const CAMPOS: { id: keyof Configuracoes; rotulo: string; ajuda: string; sufixo: string }[] = [
  {
    id: "valor_hora_trabalho",
    rotulo: "Valor da hora de trabalho",
    ajuda: "Quanto vale 1 hora do seu tempo. Multiplica o tempo de produção de cada produto.",
    sufixo: "R$/hora",
  },
  {
    id: "percentual_perdas",
    rotulo: "Perdas e retrabalho",
    ajuda: "Margem de segurança para material desperdiçado ou peças refeitas.",
    sufixo: "%",
  },
  {
    id: "percentual_custos_fixos",
    rotulo: "Custos fixos",
    ajuda: "Rateio de energia, taxa do MEI, internet e desgaste de ferramentas.",
    sufixo: "%",
  },
];

const paraFormulario = (config: Configuracoes): Formulario => ({
  valor_hora_trabalho: String(config.valor_hora_trabalho),
  percentual_perdas: String(config.percentual_perdas),
  percentual_custos_fixos: String(config.percentual_custos_fixos),
});

export default function PaginaConfiguracoes() {
  const [form, setForm] = useState<Formulario | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    void chamarApi<Configuracoes>("/api/configuracoes").then((resposta) => {
      if (!ativo) return;
      if (resposta.ok) setForm(paraFormulario(resposta.dados));
      else setErro(resposta.erro);
    });
    return () => {
      ativo = false;
    };
  }, []);

  const salvar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;

    setSalvando(true);
    setErro(null);
    setMensagem(null);
    const resposta = await chamarApi<Configuracoes>("/api/configuracoes", "PUT", {
      valor_hora_trabalho: Number(form.valor_hora_trabalho || 0),
      percentual_perdas: Number(form.percentual_perdas || 0),
      percentual_custos_fixos: Number(form.percentual_custos_fixos || 0),
    });
    setSalvando(false);

    if (resposta.ok) {
      setForm(paraFormulario(resposta.dados));
      setMensagem("Configurações salvas. Os preços dos produtos já usam os novos valores.");
    } else {
      setErro(resposta.erro);
    }
  };

  // Example: a product with R$ 10,00 of insumos, 30 minutes of work and 50% margin.
  const exemplo = form
    ? calcularPrecificacao({
        custoInsumos: 10,
        tempoProducaoMinutos: 30,
        margemDesejada: 50,
        configuracoes: {
          valor_hora_trabalho: Number(form.valor_hora_trabalho) || 0,
          percentual_perdas: Number(form.percentual_perdas) || 0,
          percentual_custos_fixos: Number(form.percentual_custos_fixos) || 0,
        },
      })
    : null;

  return (
    <main className="min-h-screen bg-[#eef2f6] px-4 py-5 text-stone-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link href="/" className="inline-block text-sm font-semibold text-stone-600 underline underline-offset-4 hover:text-stone-900">
          ← Voltar ao sistema
        </Link>

        <section className={classePainel}>
          <h1 className="text-2xl font-black tracking-tight text-stone-900">Configurações de precificação</h1>
          <p className="mt-1 text-sm text-stone-600">
            Valores usados no preço de todos os produtos. Deixe em 0 o que ainda não quiser considerar.
          </p>

          {!form ? (
            erro ? (
              <div className="mt-5"><MensagemErro mensagem={erro} /></div>
            ) : (
              <p className="mt-5 text-stone-500">Carregando…</p>
            )
          ) : (
            <form onSubmit={salvar} className="mt-5 space-y-4">
              {CAMPOS.map((campo) => (
                <div key={campo.id}>
                  <label htmlFor={campo.id} className={classeRotulo}>
                    {campo.rotulo} ({campo.sufixo})
                  </label>
                  <input
                    id={campo.id}
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    value={form[campo.id]}
                    aria-describedby={`${campo.id}_ajuda`}
                    onChange={(event) => {
                      setMensagem(null);
                      setForm((atual) => (atual ? { ...atual, [campo.id]: event.target.value } : atual));
                    }}
                    className={classeCampo}
                  />
                  <p id={`${campo.id}_ajuda`} className="mt-1 text-xs text-stone-500">{campo.ajuda}</p>
                </div>
              ))}

              <MensagemErro mensagem={erro} />
              {mensagem && (
                <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  ✓ {mensagem}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Link href="/" className={`text-center ${classeBotaoSecundario}`}>Voltar</Link>
                <button type="submit" disabled={salvando} className={classeBotaoPrimario}>
                  {salvando ? "Salvando…" : "Salvar configurações"}
                </button>
              </div>
            </form>
          )}
        </section>

        {exemplo && (
          <section className={classePainel} aria-labelledby="exemplo_titulo">
            <h2 id="exemplo_titulo" className="font-bold text-stone-900">Como fica o preço</h2>
            <p className="mt-1 text-sm text-stone-600">
              Exemplo: produto com R$ 10,00 de insumos, 30 minutos de produção e 50% de margem.
            </p>
            <dl className="mt-3 space-y-1 text-sm">
              {[
                ["Insumos", exemplo.custoInsumos],
                ["+ Mão de obra", exemplo.custoMaoObra],
                ["= Custo base", exemplo.custoBase],
                ["Com perdas", exemplo.custoComPerdas],
                ["Com custos fixos (custo total)", exemplo.custoTotal],
                ["Preço sugerido", exemplo.precoSugerido],
              ].map(([rotulo, valor], indice, lista) => (
                <div
                  key={rotulo}
                  className={`flex justify-between ${indice === lista.length - 1 ? "border-t border-stone-200 pt-1 text-base font-black text-stone-900" : "text-stone-600"}`}
                >
                  <dt>{rotulo}</dt>
                  <dd>{formatarMoeda(valor as number)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}
