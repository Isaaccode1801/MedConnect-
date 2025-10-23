async function handleSubmit(e) {
  e.preventDefault();

  // Sempre derive o papel a partir do formulário (evita "ficar preso" no default)
  const formEl = e.currentTarget;
  const roleFromForm = (new FormData(formEl).get('role') || '').toString();
  const currentRole = roleFromForm || role;

  setErr('');
  setOk('');

  if (!currentRole) {
    setErr('Selecione o tipo de usuário (médico, secretária, paciente ou admin) antes de criar.');
    return;
  }

  console.log('[CreateUser] role selecionado:', currentRole);

  if (!form.email || !form.password || !form.full_name) {
    setErr('Preencha pelo menos e-mail, senha e nome completo.');
    return;
  }

  setLoading(true);

  // ✅ declare userId no escopo da função (evita "userId is not defined")
  let userId = null;

  try {
    // ====== SEMPRE via Edge Function create-user ======
    const { data } = await api.post(
      '/functions/v1/create-user',
      {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone,
        role: currentRole, // <- papel escolhido nas abas
      },
      {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          Authorization: getBearer(), // token do admin logado (a função vai validar permissão)
          'Content-Type': 'application/json',
        },
      }
    );

    // A função deve devolver o id do usuário criado/atualizado
    userId = data?.user?.id || data?.id || null;
    if (!userId) {
      throw new Error('A Edge Function não retornou o ID do usuário.');
    }

    // ====== Após obter userId, sincroniza o profile ======
    let profileSaved = false;

    // se por algum motivo o id ainda estiver vazio, caia no filtro por e-mail
    const profileFilter = userId ? `id=eq.${userId}` : `email=eq.${encodeURIComponent(form.email)}`;

    try {
      // 1) Atualiza por id OU por e-mail (conforme profileFilter)
      await rest.patch(
        `/profiles?${profileFilter}`,
        { full_name: form.full_name, phone: form.phone },
        {
          headers: {
            Prefer: 'return=minimal',
            ...getAdminHeaders(),
          },
        }
      );
      profileSaved = true;
      console.log('✅ Perfil atualizado com sucesso!');
    } catch (err) {
      const status = err?.response?.status;
      console.warn('[CreateUser] PATCH profiles falhou', status);

      if (status === 404 || status === 400 || typeof status === 'undefined') {
        // 2) Se não existe registro, tenta criar (upsert) por e-mail
        try {
          await rest.post(
            '/profiles',
            {
              // Não enviar id aqui: deixa o banco/trigger relacionar
              email: form.email,
              full_name: form.full_name,
              phone: form.phone,
              role: currentRole, // opcional: se sua tabela profiles tiver esta coluna
              created_at: new Date().toISOString(),
            },
            {
              headers: {
                Prefer: 'resolution=merge-duplicates',
                ...getAdminHeaders(),
              },
            }
          );
          profileSaved = true;
          console.log('✅ Perfil criado via upsert');
        } catch (err2) {
          console.error('[CreateUser] POST profiles falhou', err2);
          setErr('Erro ao criar o perfil (sem permissão ou conflito).');
        }
      } else if (status === 403) {
        setErr('Sem permissão para salvar nome/telefone (RLS). Peça liberação ou use service key em DEV.');
      } else {
        setErr(`Erro ${status || ''}: não foi possível salvar o perfil (PATCH/POST profiles).`);
      }
    }

    if (profileSaved) {
      setOk(
        `${currentRole === 'medico'
          ? 'Médico'
          : currentRole === 'secretaria'
          ? 'Secretária'
          : currentRole === 'admin'
          ? 'Admin'
          : 'Paciente'} criado(a) e perfil salvo com sucesso!`
      );
    } else {
      setOk(
        `${currentRole === 'medico'
          ? 'Médico'
          : currentRole === 'secretaria'
          ? 'Secretária'
          : currentRole === 'admin'
          ? 'Admin'
          : 'Paciente'} criado(a)! Porém não foi possível salvar nome/telefone (políticas RLS).`
      );
    }

    // limpa o formulário
    setForm({ email: '', password: '', full_name: '', phone: '' });
    // mantém o role escolhido

  } catch (e) {
    const status = e?.response?.status;
    const raw = e?.response?.data || {};
    const msg = raw?.message || raw?.error_description || e?.message || 'Erro ao criar usuário';

    // Tratamento específico p/ 422 do Auth (quando a função delega e retorna esse tipo)
    let friendly = msg;
    if (status === 422) {
      if (/signups? not allowed/i.test(msg)) {
        friendly =
          'Cadastros por e-mail estão desabilitados no projeto (Auth → Providers → Email → Enable email signup).';
      } else if (/user already registered/i.test(msg)) {
        friendly = 'Este e-mail já está cadastrado.';
      } else if (/password/i.test(msg) && /weak|short|min/i.test(msg)) {
        friendly = 'Senha não atende a política. Tente uma senha mais forte/longa.';
      } else {
        friendly = `422 do Auth: ${msg}`;
      }
    }

    console.error('[CreateUser] erro', { status, data: raw });
    setErr(status ? `Erro ${status}: ${friendly}` : friendly);
  } finally {
    setLoading(false);
  }
}