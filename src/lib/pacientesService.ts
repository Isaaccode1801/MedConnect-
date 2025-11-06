// =========================================================================
//            ARQUIVO: pacientesService.ts (Corrigido)
// =========================================================================
import { supabase } from '@/lib/supabase';

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
  hide_signature?: boolean; 
  hide_date?: boolean;     

  // --- Campos hidratados (opcionais) ---
  patients?: { id?: string; full_name?: string } | null; 
  patient_name?: string | null; 
  updated_by?: string | null; 
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
    // Tenta ler o erro como JSON, se falhar, lê como texto
    let errorBody = await res.text();
    try {
        const errorJson = JSON.parse(errorBody);
        // Formata a mensagem de erro do Supabase (se disponível)
        if (errorJson.message) {
            errorBody = `Erro ${res.status}: ${errorJson.message}`;
        } else {
            errorBody = `Erro ${res.status}: ${JSON.stringify(errorJson)}`;
        }
    } catch {
        // Se não for JSON, mantém o texto simples
        errorBody = `Erro ${res.status}: ${errorBody}`;
    }
    throw new Error(errorBody);
  }
  // Se a resposta for 204 No Content (comum em DELETE), retorna um JSON vazio
  if (res.status === 204) {
    return {} as Promise<T>;
  }
  return res.json() as Promise<T>;
}

// ======================= PERFIS (USUÁRIOS) =======================
export interface Profile {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  disabled?: boolean | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_metadata?: any;
}

export async function listProfiles(): Promise<Profile[]> {
  const url = buildUrl('/profiles', { select: '*', order: 'created_at.desc' });
  return fetchJson<Profile[]>(url, { headers: getAuthHeaders() });
}

// ======================= PACIENTES =======================
export async function listPacientes(): Promise<Array<Partial<Report>>> { 
  const url = buildUrl('/patients', { select: '*', order: 'full_name.asc' });
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
export interface ListarLaudosParams {
  status?: string; 
  patient_id?: string;
  created_by?: string;
  order?: string; 
}


export async function listarLaudos(params: ListarLaudosParams = {}): Promise<Report[]> {
  const {
    status,
    patient_id,
    created_by,
    order = 'created_at.desc' 
  } = params;

  const query: Record<string, any> = {};
  if (status) query['status'] = status;
  if (patient_id) query['patient_id'] = patient_id;
  if (created_by) query['created_by'] = created_by;
  if (order) query['order'] = order; 

  const url = buildUrl('/reports', query);
  const headers = getAuthHeaders();
  let data: Report[] = [];

  try {
    data = await fetchJson<Report[]>(url, { headers });
  } catch (e) {
    console.error('[laudos] Falha ao buscar laudos. Verifique a URL, Auth e RLS.', e);
    return []; 
  }

  try {
    const ids = Array.from(new Set(data.map(b => b.patient_id).filter(Boolean))) as string[];
    let mapa: Record<string, string> = {};
    if (ids.length) {
      const inList = `(${ids.map(encodeURIComponent).join(',')})`;
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
      patients: r.patient_id ? { id: r.patient_id, full_name: mapa[r.patient_id] || undefined } : null,
    }));

  } catch (eMap) {
    console.error("[laudos] Falha ao mapear dados hidratados", eMap);
  }

  return data;
}

export async function getLaudo(id: string): Promise<Report | null> {
  // ✅ CORREÇÃO: Trocámos o '*' por uma lista explícita de colunas
  const queryParams = {
    select: 'id, order_number, exam, status, content_html, patients(id,full_name)',
    id: `eq.${id}`,
    limit: 1
  };
  
  const url = buildUrl('/reports', queryParams);
  const headers = getAuthHeaders();
  
  try {
    const arr = await fetchJson<Report[]>(url, { headers });
    const r = Array.isArray(arr) ? arr[0] ?? null : null;
    return r;
  } catch (e) {
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
function buildInParam(ids: string[]) {
  return `in.(${ids.map(encodeURIComponent).join(",")})`;
}

/**
 * Lista TODOS os laudos com nomes de pacientes e médicos (perfis).
 * Esta é uma consulta avançada para o painel de Admin.
 * (VERSÃO CORRIGIDA 4.0 - Método Manual de Múltiplas Chamadas)
 */
export async function listarLaudosAdmin() {
  const headers = getAuthHeaders();

  // 1. Buscar todos os laudos (reports)
  const urlReports = buildUrl('/reports', {
    select: 'id,order_number,exam,status,created_at,patient_id,created_by',
    order: 'created_at.desc'
  });

  let reports: any[] = [];
  try {
    reports = await fetchJson<any[]>(urlReports, { headers });
  } catch (error) {
    console.error("Erro ao listar laudos (admin) - Passo 1 (reports):", error);
    throw new Error(`Falha ao buscar laudos: ${error.message}`);
  }


  if (!reports || reports.length === 0) {
    return [];
  }

  // 2. Coletar IDs únicos
  const patientIds = Array.from(new Set(reports.map(r => r.patient_id).filter(Boolean)));
  const doctorAuthIds = Array.from(new Set(reports.map(r => r.created_by).filter(Boolean))); // created_by = auth.users.id

  // 3. Buscar Pacientes
  let patientMap = new Map<string, { id: string, full_name: string }>();
  if (patientIds.length > 0) {
    const urlPatients = buildUrl('/patients', {
      select: 'id,full_name',
      id: buildInParam(patientIds)
    });
    try {
      const patientsData = await fetchJson<any[]>(urlPatients, { headers });
      patientMap = new Map(patientsData.map(p => [p.id, p]));
    } catch (e) {
      console.warn("Falha ao buscar pacientes para laudos:", e);
    }
  }

  // 4. Buscar Médicos (Profiles)
  // A coluna 'created_by' (auth id) é a 'id' da tabela 'profiles'
  let doctorMap = new Map<string, { id: string, full_name: string }>();
  if (doctorAuthIds.length > 0) {
    const urlProfiles = buildUrl('/profiles', {
      select: 'id,full_name', // 'id' aqui é o auth_user_id
      id: buildInParam(doctorAuthIds)
    });
    try {
      const profilesData = await fetchJson<any[]>(urlProfiles, { headers });
      doctorMap = new Map(profilesData.map(p => [p.id, p]));
    } catch (e) {
      console.warn("Falha ao buscar perfis de médicos para laudos:", e);
    }
  }

  // 5. Mapear (hidratar) os resultados
  const dadosAchatados = reports.map(laudo => {
    const paciente = laudo.patient_id ? patientMap.get(laudo.patient_id) : null;
    const medico = laudo.created_by ? doctorMap.get(laudo.created_by) : null;

    return {
      id: laudo.id,
      order_number: laudo.order_number,
      exam: laudo.exam,
      status: laudo.status,
      created_at: laudo.created_at,
      
      patient_name: paciente?.full_name || null,
      patient_id: paciente?.id || null,
      
      doctor_name: medico?.full_name || null,
      doctor_id: medico?.id || null, // é o auth_id
    };
  });

  return dadosAchatados;
}

// ===================== MÉDICOS (fallbacks) =====================
export async function listarMedicos(): Promise<Array<any>> { 
  const headers = getAuthHeaders();
  
  const normalize = (arr: any[]) => (Array.isArray(arr) ? arr : []).map((m) => ({
    ...m, 
    id: m?.id ?? null,
    full_name: m?.full_name ?? m?.name ?? m?.email ?? '—',
  }));

  // 1) Tenta tabela `doctors`
  try {
    const url = buildUrl('/doctors', { select: '*', order: 'full_name.asc' }); 
    const r = await fetch(url, { headers });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d) && d.length) return normalize(d);
    }
  } catch {}

  // 3) Fallback: `profiles`
  try {
    const url = buildUrl('/profiles', { select: '*', order: 'full_name.asc' });
    const d = await fetchJson<any[]>(url, { headers });
    return normalize(d);
  } catch {
    return [];
  }
}
// ================= CONSULTAS =================

// ================= CONSULTAS =================

export async function listarConsultasComNomes() {
  const headers = getAuthHeaders();

  // 1) Buscar appointments
  const urlAppointments = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/appointments`);
  urlAppointments.searchParams.set("select", "id,doctor_id,patient_id,scheduled_at,duration_minutes,created_by");
  urlAppointments.searchParams.set("order", "scheduled_at.desc");

  let appointmentsRaw: any[] = [];
  {
    const res = await fetch(urlAppointments.toString(), { headers });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`[listarConsultasComNomes] appointments falhou ${res.status}: ${txt}`);
    }
    appointmentsRaw = await res.json();
  }

  if (!Array.isArray(appointmentsRaw) || appointmentsRaw.length === 0) {
    return [];
  }

  // 2) coletar todos os patient_id e doctor_id únicos
  const patientIds = Array.from(
    new Set(appointmentsRaw.map(a => a.patient_id).filter(Boolean))
  );
  const doctorIds = Array.from(
    new Set(appointmentsRaw.map(a => a.doctor_id).filter(Boolean))
  );

  // helper para montar "in.(id1,id2,id3)" como Supabase espera
  function buildInParam(ids: string[]) {
    return `in.(${ids.map(encodeURIComponent).join(",")})`;
  }

  // 3) buscar info dos pacientes
  let mapaPacientes: Record<string, { nome?: string; phone?: string; cpf?: string }> = {};
  if (patientIds.length) {
    const urlPatients = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/patients`);
    
    // ✅ CORREÇÃO AQUI
    urlPatients.searchParams.set("select", "id,full_name,phone_mobile,cpf");
    
    urlPatients.searchParams.set("id", buildInParam(patientIds));

    const resP = await fetch(urlPatients.toString(), { headers });
    if (resP.ok) {
      const arrP = await resP.json();
      mapaPacientes = Object.fromEntries(
        arrP.map((p: any) => [
          p.id,
          {
            nome: p.full_name || "",
            // ✅ CORREÇÃO AQUI
            phone: p.phone_mobile || "",
            cpf: p.cpf || "",
          },
        ])
      );
    } else {
      console.warn("[listarConsultasComNomes] Falha ao carregar pacientes");
    }
  }

  // 4) buscar info dos médicos
  let mapaMedicos: Record<string, { nome?: string }> = {};
  if (doctorIds.length) {
    const urlDoctors = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/doctors`);
    urlDoctors.searchParams.set("select", "id,full_name");
    urlDoctors.searchParams.set("id", buildInParam(doctorIds));

    const resD = await fetch(urlDoctors.toString(), { headers });
    if (resD.ok) {
      const arrD = await resD.json();
      mapaMedicos = Object.fromEntries(
        arrD.map((d: any) => [
          d.id,
          {
            nome: d.full_name || "",
          },
        ])
      );
    } else {
      console.warn("[listarConsultasComNomes] Falha ao carregar médicos");
    }
  }

  // 5) montar resultado final já com nomes
  return appointmentsRaw.map((a: any) => {
    const pacienteInfo = a.patient_id ? mapaPacientes[a.patient_id] || {} : {};
    const medicoInfo = a.doctor_id ? mapaMedicos[a.doctor_id] || {} : {};

    return {
      id: a.id,
      scheduled_at: a.scheduled_at,
      duration_minutes: a.duration_minutes,
      cpf: pacienteInfo.cpf || "",
      paciente_nome: pacienteInfo.nome || "",
      paciente_telefone: pacienteInfo.phone || "", // Isto agora funciona
      medico_nome: medicoInfo.nome || "",
    };
  });
}
export interface AgendamentoPayload {
  doctor_id: string;
  patient_id: string;
  scheduled_at: string; // Formato ISO 8601 UTC: "2025-10-25T10:00:00Z"
  created_by: string;
  duration_minutes?: number;
  status?: string;
}

// =========================================================================
//                     🚀 FUNÇÃO MODIFICADA 🚀
// =========================================================================
/**
 * Cria um novo agendamento (appointment) na API.
 * 🚀 VERSÃO CORRIGIDA (2.0):
 * Esta versão chama uma função RPC (ex: /functions/v1/create-appointment)
 * em vez de tentar escrever diretamente na tabela (ex: /rest/v1/appointments),
 * para contornar as restrições de RLS (Erro 403).
 */
export async function criarAgendamento(payload: AgendamentoPayload): Promise<any> {
  // (a lógica do 'body' continua igual)
  const body: AgendamentoPayload = {
     duration_minutes: 30,
     status: 'requested',
     ...payload,
  };

  // Usamos o nosso novo proxy + o caminho real da API que a doc diz
  const url = 'https://yuanqfswhberkoevtmfr.supabase.co/rest/v1/appointments';

  const restHeaders = getAuthHeaders();


  return fetchJson(url, {
    method: 'POST',
    headers: restHeaders, // <-- Usar os headers REST
    body: JSON.stringify(body)
  });
}
// =========================================================================
//                   FIM DA FUNÇÃO MODIFICADA
// =========================================================================

export interface DoctorAvailability {
  id: string;
  doctor_id: string;
  weekday: number; // 0=Domingo, 1=Segunda, ..., 6=Sábado
  start_time: string; // "08:00"
  end_time: string; // "18:00"
  slot_minutes: number; // 30
  appointment_type: 'presencial' | 'telemedicina';
  active: boolean;
}

/**
 * Busca as regras de disponibilidade (horários de trabalho) de um médico específico.
 */
export async function listarDisponibilidadeMedico(doctorId: string): Promise<DoctorAvailability[]> {
  // Monta a query para buscar apenas as disponibilidades ativas do médico selecionado
  const queryParams = {
    doctor_id: `eq.${doctorId}`,
    active: 'eq.true'
  };

  const url = buildUrl('/doctor_availability', queryParams);
  
  // Usa as funções 'getAuthHeaders' e 'fetchJson' existentes
  return fetchJson<DoctorAvailability[]>(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
}
// VERSÃO CORRIGIDA
export async function getMyPatientRecordId(authUserId: string): Promise<string | null> {
  const headers = getAuthHeaders();
  delete headers['Prefer']; 

  const { data, error } = await supabase
    .from('patients')
    .select('id') 
    .eq('user_id', authUserId) 
    .limit(1); // <--- CORREÇÃO: Usamos .limit(1) em vez de .single()

  if (error) {
    console.error("Erro ao buscar registro de paciente:", error.message);
    return null;
  }
  
  // Como .limit(1) retorna um array (ex: [{id: '...'}])
  // nós pegamos o ID do primeiro item.
  return data?.[0]?.id || null; // <--- CORREÇÃO: Pegamos o id de data[0]
}