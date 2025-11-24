// src/services/api/auth.ts
import { supabase } from "@/lib/supabase";

export type CurrentUserResponse = {
  id: string;
  email: string;
  created_at: string; // ISO string
};

// Busca o usuário atual via REST (/auth/v1/user)
export async function fetchCurrentUser(): Promise<CurrentUserResponse> {
  // Pega a sessão atual do Supabase (para ter o access_token)
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("[fetchCurrentUser] erro ao pegar sessão:", sessionError);
    throw new Error("Erro ao obter sessão do usuário.");
  }

  if (!session || !session.access_token) {
    throw new Error("Usuário não autenticado.");
  }

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Configuração do Supabase ausente (URL ou API key).");
  }

  const response = await fetch(`${baseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[fetchCurrentUser] erro HTTP:", response.status, text);
    throw new Error("Erro ao buscar dados do usuário.");
  }

  const data = (await response.json()) as CurrentUserResponse;
  return data;
}