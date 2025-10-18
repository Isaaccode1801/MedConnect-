// src/services/api/laudos.ts
// ---> Usa pacientesService como fonte de headers/autenticação
import { getHeaders } from "@/lib/pacientesService";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export type LaudoPayload = {
  patient_id: string;
  exam: string;
  requested_by?: string | null;
  content_html?: string;
  status?: "draft" | "published" | "archived";
  hide_signature?: boolean;
  due_at?: string | null;
  order_number?: string;
};

function ensureAuth() {
  const h = getHeaders();
  const hasUserToken =
    (h.Authorization || "").startsWith("Bearer ") &&
    !(h.Authorization || "").endsWith("undefined");
  return { headers: h, hasUserToken } as const;
}

export async function createLaudo(body: LaudoPayload) {
  const { headers, hasUserToken } = ensureAuth();

  // Se você quiser falhar cedo quando estiver sem login (RLS do Supabase bloqueia anon inserts)
  if (!hasUserToken) {
    throw new Error(
      "Você não está autenticado. Faça login para criar laudos (RLS ativo no Supabase)."
    );
  }

  const url = `${SUPABASE_URL}/rest/v1/reports`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      Accept: "application/json",
      Prefer: "return=representation", // retorna o registro inserido
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${txt || res.statusText}`);
  }

  const data = await res.json().catch(() => null);
  return Array.isArray(data) ? data[0] : data;
}

// (opcional) Se sua listagem de laudos usa esse serviço:
export async function listLaudos(limit = 100) {
  const { headers } = ensureAuth();
  const url = `${SUPABASE_URL}/rest/v1/reports?select=*&order=created_at.desc&limit=${limit}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${txt || res.statusText}`);
  }
  return (await res.json()) as any[];
}

export async function getLaudo(id: string) {
  const { headers } = ensureAuth();
  const url = `${SUPABASE_URL}/rest/v1/reports?id=eq.${encodeURIComponent(id)}&select=*`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${txt || res.statusText}`);
  }
  const data = await res.json().catch(() => null);
  return Array.isArray(data) ? data[0] : data;
}