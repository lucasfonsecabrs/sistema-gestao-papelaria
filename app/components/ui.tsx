"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

import type { StatusEstoque } from "@/lib/estoque";
import type { StatusPedido, UrgenciaPedido } from "@/lib/pedidos";

export const classeCampo =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-800 shadow-sm outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200 disabled:bg-stone-100";
export const classeRotulo = "mb-1.5 block text-sm font-medium text-stone-700";
export const classeBotaoPrimario =
  "rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60";
export const classeBotaoSecundario =
  "rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-60";
export const classeBotaoPerigo =
  "rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60";
export const classeBotaoLinha =
  "rounded-md border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-40";
export const classeBotaoLinhaPerigo =
  "rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-100";
export const classePainel = "rounded-xl border border-stone-200 bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)] md:p-6";

export const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

// Small unit costs (R$ 0,014 per cm) would round to R$ 0,01 with 2 digits.
export const formatarCustoUnitario = (valor: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: valor > 0 && valor < 0.1 ? 3 : 2,
  }).format(valor);

const TONS = {
  vermelho: "bg-red-100 text-red-800 ring-red-200",
  laranja: "bg-orange-100 text-orange-800 ring-orange-200",
  amarelo: "bg-amber-100 text-amber-800 ring-amber-200",
  azul: "bg-sky-100 text-sky-800 ring-sky-200",
  verde: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  cinza: "bg-stone-100 text-stone-700 ring-stone-200",
  roxo: "bg-violet-100 text-violet-800 ring-violet-200",
} as const;

export type Tom = keyof typeof TONS;

// Status is never conveyed by color alone: every badge has an icon and text.
export function Selo({ tom, icone, children }: { tom: Tom; icone?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${TONS[tom]}`}>
      {icone && <span aria-hidden="true">{icone}</span>}
      {children}
    </span>
  );
}

type DefinicaoSelo = { tom: Tom; icone: string; rotulo: string };

const SELO_URGENCIA: Record<UrgenciaPedido, DefinicaoSelo> = {
  atrasado: { tom: "vermelho", icone: "⏰", rotulo: "Atrasado" },
  urgente: { tom: "laranja", icone: "⚠", rotulo: "Urgente" },
  proximo: { tom: "azul", icone: "📅", rotulo: "Próximo" },
  tranquilo: { tom: "verde", icone: "✓", rotulo: "Tranquilo" },
};

export function SeloUrgencia({ urgencia }: { urgencia: UrgenciaPedido }) {
  const selo = SELO_URGENCIA[urgencia];
  return <Selo tom={selo.tom} icone={selo.icone}>{selo.rotulo}</Selo>;
}

const SELO_STATUS: Record<StatusPedido, DefinicaoSelo> = {
  pendente: { tom: "cinza", icone: "○", rotulo: "Pendente" },
  em_producao: { tom: "roxo", icone: "✂", rotulo: "Em produção" },
  pronto: { tom: "azul", icone: "✔", rotulo: "Pronto" },
  entregue: { tom: "verde", icone: "📦", rotulo: "Entregue" },
};

export function SeloStatus({ status }: { status: StatusPedido }) {
  const selo = SELO_STATUS[status];
  return <Selo tom={selo.tom} icone={selo.icone}>{selo.rotulo}</Selo>;
}

const SELO_ESTOQUE: Record<StatusEstoque, DefinicaoSelo> = {
  critico: { tom: "vermelho", icone: "⛔", rotulo: "Crítico" },
  baixo: { tom: "amarelo", icone: "▼", rotulo: "Baixo" },
  normal: { tom: "verde", icone: "✓", rotulo: "Normal" },
};

export function SeloEstoque({ situacao }: { situacao: StatusEstoque }) {
  const selo = SELO_ESTOQUE[situacao];
  return <Selo tom={selo.tom} icone={selo.icone}>{selo.rotulo}</Selo>;
}

export function CabecalhoSecao({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-bold text-stone-900">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-sm text-stone-500">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function EstadoVazio({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-10 text-center">
      <p className="font-semibold text-stone-800">{titulo}</p>
      {descricao && <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">{descricao}</p>}
      {acao && <div className="mt-4 flex justify-center gap-2">{acao}</div>}
    </div>
  );
}

export function CampoBusca({
  valor,
  onMudar,
  placeholder,
}: {
  valor: string;
  onMudar: (valor: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:min-w-56">
      <input
        type="search"
        value={valor}
        onChange={(event) => onMudar(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={classeCampo}
      />
    </div>
  );
}

export function Modal({
  titulo,
  onFechar,
  children,
  largura = "max-w-2xl",
}: {
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  largura?: string;
}) {
  const tituloId = useId();

  useEffect(() => {
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-950/45 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={`my-4 w-full ${largura} rounded-2xl bg-white p-5 shadow-[0_20px_60px_rgba(28,25,23,0.25)] ring-1 ring-stone-200 md:p-6`}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 id={tituloId} className="text-xl font-bold text-stone-900">
            {titulo}
          </h3>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-stone-200"
          >
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export type Confirmacao = {
  titulo: string;
  mensagem: ReactNode;
  rotulo: string;
  executar: () => Promise<void>;
};

export function DialogoConfirmacao({
  confirmacao,
  onCancelar,
}: {
  confirmacao: Confirmacao;
  onCancelar: () => void;
}) {
  const [executando, setExecutando] = useState(false);

  return (
    <Modal titulo={confirmacao.titulo} onFechar={onCancelar} largura="max-w-md">
      <div className="text-sm leading-6 text-stone-600">{confirmacao.mensagem}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancelar} className={classeBotaoSecundario}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={executando}
          autoFocus
          onClick={async () => {
            setExecutando(true);
            await confirmacao.executar();
            setExecutando(false);
          }}
          className={classeBotaoPerigo}
        >
          {executando ? "Aguarde…" : confirmacao.rotulo}
        </button>
      </div>
    </Modal>
  );
}

export type Aviso = {
  id: number;
  tipo: "sucesso" | "erro";
  texto: string;
  acao?: { rotulo: string; executar: () => void };
};

export function Avisos({ avisos, onFechar }: { avisos: Aviso[]; onFechar: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {avisos.map((aviso) => (
        <div
          key={aviso.id}
          role={aviso.tipo === "erro" ? "alert" : "status"}
          className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
            aviso.tipo === "erro"
              ? "bg-red-50 text-red-800 ring-red-200"
              : "bg-stone-900 text-white ring-stone-900"
          }`}
        >
          <span className="flex-1">{aviso.texto}</span>
          {aviso.acao && (
            <button
              type="button"
              onClick={() => {
                aviso.acao?.executar();
                onFechar(aviso.id);
              }}
              className="font-bold underline underline-offset-2"
            >
              {aviso.acao.rotulo}
            </button>
          )}
          <button type="button" onClick={() => onFechar(aviso.id)} aria-label="Fechar aviso" className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function MensagemErro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {mensagem}
    </p>
  );
}

export function PainelLixeira({
  titulo,
  itens,
  onRestaurar,
  onFechar,
}: {
  titulo: string;
  itens: { id: string; nome: string; detalhe?: string }[];
  onRestaurar: (id: string) => Promise<void>;
  onFechar: () => void;
}) {
  return (
    <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-stone-900">{titulo}</h3>
          <p className="text-sm text-stone-500">Itens excluídos ficam guardados aqui e podem voltar quando quiser.</p>
        </div>
        <button type="button" onClick={onFechar} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
          Fechar
        </button>
      </div>
      {itens.length === 0 ? (
        <p className="text-sm text-stone-600">A lixeira está vazia.</p>
      ) : (
        <ul className="space-y-2">
          {itens.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-stone-900">{item.nome}</p>
                {item.detalhe && <p className="text-sm text-stone-500">{item.detalhe}</p>}
              </div>
              <button
                type="button"
                onClick={() => onRestaurar(item.id)}
                className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
