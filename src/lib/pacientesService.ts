// =========================================================================
//                      ARQUIVO: pacientesService.ts (revisto)
// =========================================================================

// Base da API (Supabase REST)
const API_BASE_URL: string = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1`;
const API_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!import.meta.env.VITE_SUPABASE_URL || !API_KEY) {
  // Log leve para ajudar em 401 causados por env faltando
  // eslint-disable-next-line no-console
  console.error("[pacientesService] Variáveis de ambiente ausentes: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY");
}

// ------------------------ Storage helpers ------------------------
function safeGet(key: string): string {
  try {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(key) ?? sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function safeSet(key: string, value: string) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {}
}

export function setUserSession(user_token: string | { access_token: string }, user_role?: string) {
  const token = typeof user_token === 'string' ? user_token : user_token?.access_token;
  if (token) safeSet('user_token', token);
  if (user_role) safeSet('user_role', user_role);
}

export function clearUserSession() {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_role');
  } catch {}
}

// Lê o token do usuário em `user_token` (string pura ou JSON { access_token })
export function readUserToken(): string {
  const raw = safeGet('user_token');
  if (!raw) return '';
  try {
    if (raw.trim().startsWith('{')) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.access_token === 'string') return parsed.access_token;
    }
  } catch {}
  return raw;
}

// Lê o papel do usuário
export function getUserRole(): string {
  return safeGet('user_role') || 'public';
}

// Cabeçalhos de autenticação padronizados
export function getAuthHeaders(): Record<string, string> {
  const bearer = readUserToken() || API_KEY; // fallback: anon key
  return {
    apikey: API_KEY,
    Authorization: `Bearer ${bearer}`,
    'x-user-role': getUserRole(),
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

// Mantém compatibilidade com importações antigas
export { getAuthHeaders as getHeaders };

// ------------------------ Tipos mínimos ------------------------
export interface Report {
  id: string;
  patient_id: string | null;
  order_number?: string;
  exam?: string;
  diagnosis?: string;
  conclusion?: string;
  cid_code?: string;
  content_html?: string;
  content_json?: unknown;
  status?: string;
  requested_by?: string;
  due_at?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  // campos hidratados
  patients?: { id?: string; full_name?: string } | null;
  patient_name?: string | null;
}

// Pequeno helper para montar URL com querystring
function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ======================= PACIENTES =======================
export async function listPacientes(): Promise<Array<{ id: string; full_name: string }>> {
  const url = buildUrl('/patients', { select: 'id,full_name', order: 'full_name.asc' });
  return fetchJson(url, { headers: getAuthHeaders() });
}

export async function getPaciente(id: string | number): Promise<any> {
  const url = buildUrl('/patients', { select: '*', id: `eq.${id}`, limit: 1 });
  const data = await fetchJson<any[]>(url, { headers: getAuthHeaders() });
  return Array.isArray(data) ? data[0] ?? null : null;
}

export async function createPaciente(dados: Record<string, unknown>): Promise<any> {
  const url = `${API_BASE_URL}/patients`;
  return fetchJson(url, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(dados) });
}

export async function updatePaciente(id: string | number, dados: Record<string, unknown>): Promise<any> {
  const url = buildUrl('/patients', { id: `eq.${id}` });
  return fetchJson(url, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(dados) });
}

export async function deletePaciente(id: string | number): Promise<void> {
  const url = buildUrl('/patients', { id: `eq.${id}` });
  await fetchJson(url, { method: 'DELETE', headers: getAuthHeaders() });
}

// ========================= LAUDOS =========================
export interface ListarLaudosParams {
  limit?: number;
  status?: string;
  patient_id?: string;
}

export async function listarLaudos(params: ListarLaudosParams = {}): Promise<Report[]> {
  const { limit = 100, status, patient_id } = params;

  // 1) Tenta com relacionamento (se houver FK configurada)
  const query1: Record<string, any> = {
    select: '*,patients(id,full_name)',
    order: 'created_at.desc',
    limit,
  };
  if (status) query1['status'] = `eq.${status}`;
  if (patient_id) query1['patient_id'] = `eq.${patient_id}`;

  const url1 = buildUrl('/reports', query1);
  const headers = getAuthHeaders();
  let data: Report[] = [];

  try {
    data = await fetchJson<Report[]>(url1, { headers });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[laudos] Falha no join com patients(full_name). Vai hidratar manualmente.', e);
  }

  // Se não retornou nomes, hidrata manualmente buscando patients pelo IN
  const precisaHidratar = !Array.isArray(data) || data.length === 0 || data.some(r => !r.patients?.full_name);
  if (precisaHidratar) {
    // Busca "seco"
    const query2: Record<string, any> = { select: '*', order: 'created_at.desc', limit };
    if (status) query2['status'] = `eq.${status}`;
    if (patient_id) query2['patient_id'] = `eq.${patient_id}`;
    const url2 = buildUrl('/reports', query2);
    const base = await fetchJson<Report[]>(url2, { headers });

    // Hidrata nomes dos pacientes em lote
    const ids = Array.from(new Set(base.map(b => b.patient_id).filter(Boolean))) as string[];
    let mapa: Record<string, string> = {};
    if (ids.length) {
      // formata IN: (id1,id2,...)
      const inList = `(${ids.map(encodeURIComponent).join(',')})`;
      const urlP = buildUrl('/patients', { select: 'id,full_name', 'id': `in.${inList}` });
      try {
        const pacs = await fetchJson<Array<{ id: string; full_name: string }>>(urlP, { headers });
        mapa = Object.fromEntries(pacs.map(p => [p.id, p.full_name]));
      } catch {}
    }

    data = base.map(r => ({
      ...r,
      patient_name: r.patient_id ? (mapa[r.patient_id] || null) : null,
      patients: r.patient_id ? { id: r.patient_id, full_name: mapa[r.patient_id] } : null,
    }));
  } else {
    // Normaliza campo auxiliar patient_name
    data = data.map(r => ({ ...r, patient_name: r.patients?.full_name ?? null }));
  }

  return data;
}

export async function getLaudo(id: string): Promise<Report | null> {
  const url = buildUrl('/reports', { select: '*,patients(id,full_name)', id: `eq.${id}`, limit: 1 });
  const headers = getAuthHeaders();
  try {
    const arr = await fetchJson<Report[]>(url, { headers });
    const r = Array.isArray(arr) ? arr[0] ?? null : null;
    if (!r) return null;
    if (r.patients?.full_name) return { ...r, patient_name: r.patients.full_name };
    // hidrata nome se necessário
    if (r.patient_id) {
      const p = await getPaciente(r.patient_id);
      return { ...r, patient_name: p?.full_name ?? null } as Report;
    }
    return r;
  } catch (e) {
    // fallback simples sem join
    const url2 = buildUrl('/reports', { select: '*', id: `eq.${id}`, limit: 1 });
    const arr = await fetchJson<Report[]>(url2, { headers });
    const r = Array.isArray(arr) ? arr[0] ?? null : null;
    if (r?.patient_id) {
      const p = await getPaciente(r.patient_id);
      return { ...r, patient_name: p?.full_name ?? null } as Report;
    }
    return r;
  }
}

export async function createLaudo(dados: Partial<Report>): Promise<any> {
  const url = `${API_BASE_URL}/reports`;
  return fetchJson(url, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(dados) });
}

export async function updateLaudo(id: string, dados: Partial<Report>): Promise<any> {
  const url = buildUrl('/reports', { id: `eq.${id}` });
  return fetchJson(url, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(dados) });
}

export async function excluirLaudo(id: string): Promise<void> {
  const url = buildUrl('/reports', { id: `eq.${id}` });
  await fetchJson(url, { method: 'DELETE', headers: getAuthHeaders() });
}

// ===================== MÉDICOS (fallbacks) =====================
export async function listarMedicos(): Promise<Array<{ id: string | null; full_name: string }>> {
  const headers = getAuthHeaders();
  const normalize = (arr: any[]) => (Array.isArray(arr) ? arr : []).map((m) => ({
    id: m?.id ?? null,
    full_name: m?.full_name ?? m?.name ?? m?.email ?? '—',
  }));

  // 1) Tenta tabela `doctors`
  try {
    const url = buildUrl('/doctors', { select: 'id,full_name', order: 'full_name.asc' });
    const r = await fetch(url, { headers });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d) && d.length) return normalize(d);
    }
  } catch {}

  // 2) Tenta `user_directory` (como sugerido no erro do PostgREST)
  try {
    const url = buildUrl('/user_directory', { select: 'id,full_name,role', role: 'eq.doctor', order: 'full_name.asc' });
    const d = await fetchJson<any[]>(url, { headers });
    if (Array.isArray(d) && d.length) return normalize(d);
  } catch {}

  // 3) Fallback: `profiles`
  try {
    const url = buildUrl('/profiles', { select: 'id,full_name', order: 'full_name.asc' });
    const d = await fetchJson<any[]>(url, { headers });
    return normalize(d);
  } catch {
    return [];
  }
}