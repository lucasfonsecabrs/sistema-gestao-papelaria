import { createClient } from "@supabase/supabase-js";

// Only the API routes (server) talk to Supabase. The service_role key bypasses
// RLS, so it must never get the NEXT_PUBLIC_ prefix; the anon key is a fallback
// that only reads while RLS has no write policies.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Se o banco não responder a tempo, a requisição é cancelada e o repositório
// usa os dados em memória, em vez de deixar a tela presa em "Carregando...".
const TEMPO_LIMITE_MS = 3000;

const fetchComTempoLimite: typeof fetch = (input, init) => {
  const limite = AbortSignal.timeout(TEMPO_LIMITE_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, limite]) : limite;
  return fetch(input, { ...init, signal });
};

export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
        global: { fetch: fetchComTempoLimite },
      })
    : null;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

export function getSupabaseClient() {
  return hasSupabaseConfig ? supabase : null;
}
