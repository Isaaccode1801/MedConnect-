// =========================================================================
//                      ARQUIVO: pacientesService.ts (revisto)
// =========================================================================

// Base da API (Supabase REST)
const API_BASE_URL: string = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1`;
const API_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FUNCTIONS_BASE_URL = API_BASE_URL.replace('/rest/v1', '/functions/v1');
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
  due_at?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
// --- Propriedades em falta ---
  hide_signature?: boolean; // <-- ADICIONE esta linha
  hide_date?: boolean;      // <-- ADICIONE esta linha (vi na Spec)

  // --- Campos hidratados (opcionais) ---
  patients?: { id?: string; full_name?: string } | null; // Já existe
  patient_name?: string | null; // Já existe
  updated_by?: string | null; // Adicione se necessário (vi na Spec)
}

// Pequeno helper para montar URL com querystring
// Em: pacientesService.ts

// ...

// Pequeno helper para montar URL com querystring
function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      // VOLTAR A IGNORAR STRINGS VAZIAS (Correto para Supabase)
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

// ...

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ======================= PACIENTES =======================
export async function listPacientes(): Promise<Array<Partial<Report>>> { // Pode usar Partial<Report> ou um tipo Paciente mais completo
  // CORREÇÃO: Mude 'select' para '*' para buscar todas as colunas
  const url = buildUrl('/patients', { select: '*', order: 'full_name.asc' });
  // O tipo de retorno do fetchJson também precisa ser ajustado se você for mais estrito
  return fetchJson<Array<Partial<Report>>>(url, { headers: getAuthHeaders() });
}
export async function getPaciente(id: string | number): Promise<any> {
  const url = buildUrl('/patients', { select: '*', id: `eq.${id}`, limit: 1 });
  const data = await fetchJson<any[]>(url, { headers: getAuthHeaders() });
  return Array.isArray(data) ? data[0] ?? null : null;
}

export async function createPaciente(dados: Record<string, unknown>): Promise<any> {
  const url = `${FUNCTIONS_BASE_URL}/create-patient`;
 
  const baseHeaders = getAuthHeaders();
  const functionHeaders: Record<string, string> = {
    Authorization: baseHeaders.Authorization, 
    'Content-Type': baseHeaders['Content-Type'], 
    apikey: baseHeaders.apikey, 
    // 'x-user-role': baseHeaders['x-user-role'] // Opcional: Pode remover se a function não usar
    // NÃO inclua 'Prefer'
  };
  return fetchJson(url, { method: 'POST', headers: functionHeaders, body: JSON.stringify(dados) });
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
// MUDANÇA 2: Interface deve ter os campos do CURL
export interface ListarLaudosParams {
  status?: string;       // Como na Spec
  patient_id?: string;   // Como na Spec
  created_by?: string;   // Como na Spec
  order?: string;        // Como na Spec
  // 'limit' não está na Spec, então não o colocamos aqui
}

// MUDANÇA 3: Reescrever listarLaudos para BATER COM O CURL
export async function listarLaudos(params: ListarLaudosParams = {}): Promise<Report[]> {
  const {
    status,
    patient_id,
    created_by,
    order = 'created_at.desc' // Usar um padrão razoável
  } = params;

  // Monta a query APENAS com os parâmetros da Spec
  const query: Record<string, any> = {};
  // Adiciona os parâmetros SÓ SE tiverem valor (buildUrl vai ignorar os vazios/undefined)
  if (status) query['status'] = status;
  if (patient_id) query['patient_id'] = patient_id;
  if (created_by) query['created_by'] = created_by;
  if (order) query['order'] = order; // Usa o padrão ou o que for passado

  // Usa a função buildUrl ORIGINAL (que ignora parâmetros vazios)
  const url = buildUrl('/reports', query);
  const headers = getAuthHeaders();
  let data: Report[] = [];

  try {
    // Busca os dados - AGORA SEM 'select' ou 'eq.'
    data = await fetchJson<Report[]>(url, { headers });
  } catch (e) {
    console.error('[laudos] Falha ao buscar laudos. Verifique a URL, Auth e RLS.', e);
    return []; // Retorna array vazio se a API falhar
  }

  // IMPORTANTE: Como não usamos 'select=*,patients(...)', os nomes NÃO virão automaticamente.
  // A lógica de hidratação manual (buscar nomes depois) AINDA É NECESSÁRIA.
  // (Esta era a lógica 'precisaHidratar' do seu código original)

  try {
    // Hidrata nomes dos pacientes em lote (SE a API /patients funcionar com Supabase)
    const ids = Array.from(new Set(data.map(b => b.patient_id).filter(Boolean))) as string[];
    let mapa: Record<string, string> = {};
    if (ids.length) {
      const inList = `(${ids.map(encodeURIComponent).join(',')})`;
        // Esta chamada AINDA usa sintaxe Supabase. PODE FALHAR se /patients também for customizado.
      const urlP = buildUrl('/patients', { select: 'id,full_name', 'id': `in.${inList}` });
      try {
        const pacs = await fetchJson<Array<{ id: string; full_name: string }>>(urlP, { headers });
        mapa = Object.fromEntries(pacs.map(p => [p.id, p.full_name]));
      } catch (eHydrate) {
        console.warn("[laudos] Falha ao hidratar nomes de pacientes. Verifique API /patients e RLS.", eHydrate);
      }
    }

    data = data.map(r => ({
      ...r,
      patient_name: r.patient_id ? (mapa[r.patient_id] || null) : null,
      // O campo 'patients' pode não vir mais, então adaptamos
      patients: r.patient_id ? { id: r.patient_id, full_name: mapa[r.patient_id] || undefined } : null,
    }));

  } catch (eMap) {
    console.error("[laudos] Falha ao mapear dados hidratados", eMap);
  }

  return data;
}

export async function getLaudo(id: string): Promise<Report | null> {
  const url = buildUrl('/reports', { select: '*,patients(id,full_name)', id: `eq.${id}`, limit: 1 });
  const headers = getAuthHeaders();
  try {
    const arr = await fetchJson<Report[]>(url, { headers });
    return Array.isArray(arr) ? arr[0] ?? null : null;
    const r = Array.isArray(arr) ? arr[0] ?? null : null;

    return r;
  }  catch (e) {
    console.error(`[getLaudo] Falha ao buscar laudo ${id}`, e);

    return null;
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


  // 3) Fallback: `profiles`
  try {
    const url = buildUrl('/profiles', { select: 'id,full_name', order: 'full_name.asc' });
    const d = await fetchJson<any[]>(url, { headers });
    return normalize(d);
  } catch {
    return [];
  }
}