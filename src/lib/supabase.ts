import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // Logs amigáveis para diagnosticar 401 causados por URL/chave ausentes
  // OBS: somente o tamanho da chave é logado por segurança
  // eslint-disable-next-line no-console
  console.error(
    "[Supabase] Ambiente inválido. Verifique .env.local: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY",
    { urlPresent: !!url, anonKeyLength: anonKey?.length ?? 0 }
  );
}

export const supabase = createClient(url || "", anonKey || "", {
  auth: {
    persistSession: true,
    storage: window.localStorage,
    autoRefreshToken: true,
  },
});

// Debug leve (pode remover após validar)
// eslint-disable-next-line no-console
console.info("[Supabase] URL:", url, "AnonKey length:", anonKey?.length ?? 0);