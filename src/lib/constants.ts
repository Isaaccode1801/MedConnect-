// Centraliza somente variáveis de ambiente.
// Toda lógica HTTP fica em src/lib/pacientesService.ts

export const API_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const API_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// (Opcional) Nome da aplicação
export const APP_NAME = 'MedConnect';