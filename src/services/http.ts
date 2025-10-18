// src/services/http.ts
// Cliente HTTP flexível: API própria OU Supabase REST.
// Prioridade de modo:
// 1) VITE_API_MODE ("custom" | "supabase")
// 2) Se VITE_API_URL contiver "supabase.co", força modo "supabase"
// 3) Se houver VITE_API_URL -> "custom"; senão -> "supabase"

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const API_BEARER = import.meta.env.VITE_API_BEARER as string | undefined;
const EXPLICIT_MODE = (import.meta.env.VITE_API_MODE as string | undefined)?.toLowerCase() as
  | "custom"
  | "supabase"
  | undefined;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const SUPABASE_SCHEMA = (import.meta.env.VITE_SUPABASE_SCHEMA as string) || "public";

function detectMode(): "custom" | "supabase" {
  if (EXPLICIT_MODE === "custom" || EXPLICIT_MODE === "supabase") return EXPLICIT_MODE;
  if (API_URL && /supabase\.co/i.test(API_URL)) return "supabase"; // evita chamar /laudos na raiz do domínio
  if (API_URL) return "custom";
  return "supabase";
}

const MODE = detectMode();

if (MODE === "custom") {
  if (!API_URL) console.warn("[http] Defina VITE_API_URL no .env (modo custom)");
} else {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[http] Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env (modo Supabase)");
  }
}

const BASE_URL =
  MODE === "custom"
    ? API_URL!.replace(/\/$/, "")
    : `${SUPABASE_URL}/rest/v1`;

function joinPath(path: string) {
  if (!path) return "";
  return path.startsWith("/") ? path : `/${path}`;
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toString().toUpperCase() as Method;

  const common: HeadersInit =
    MODE === "custom"
      ? {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(API_BEARER ? { Authorization: `Bearer ${API_BEARER}` } : {}),
        }
      : {
          "Content-Type": "application/json",
          Accept: "application/json",
          Prefer: "return=representation",
          apikey: SUPABASE_KEY!,
          Authorization: `Bearer ${SUPABASE_KEY!}`,
          ...(method === "GET"
            ? { "Accept-Profile": SUPABASE_SCHEMA }
            : { "Content-Profile": SUPABASE_SCHEMA }),
        };

  const res = await fetch(`${BASE_URL}${joinPath(path)}`, {
    ...options,
    headers: {
      ...common,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let detail: any;
    try {
      detail = await res.json();
    } catch {
      detail = await res.text();
    }
    throw new Error(
      `HTTP ${res.status} — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function get<T>(path: string, init?: RequestInit) {
  return request<T>(path, { method: "GET", ...(init || {}) });
}
export function post<T>(path: string, body?: unknown, init?: RequestInit) {
  return request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    ...(init || {}),
  });
}
export function put<T>(path: string, body?: unknown, init?: RequestInit) {
  return request<T>(path, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
    ...(init || {}),
  });
}
export function patch<T>(path: string, body?: unknown, init?: RequestInit) {
  return request<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
    ...(init || {}),
  });
}
export function del<T>(path: string, init?: RequestInit) {
  return request<T>(path, { method: "DELETE", ...(init || {}) });
}