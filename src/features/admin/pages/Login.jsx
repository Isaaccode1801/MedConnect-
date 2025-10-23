// HealthOneProject/admin-dashboard/src/pages/Login.jsx
import { useState } from 'react';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('usuario@exemplo.com');
  const [password, setPassword] = useState('senha123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/v1/token', { email, password });
      // a doc retorna { access_token, token_type, ... }
      localStorage.setItem('auth.token', data.access_token);
      window.location.href = '/users';
    } catch (err) {
      setError('Falha ao autenticar. Verifique credenciais ou cabeçalhos do Apidog.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-xl w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <label className="block">
          <span className="text-sm">E-mail</span>
          <input className="mt-1 w-full rounded-lg px-3 py-2 text-slate-900" value={email} onChange={e=>setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm">Senha</span>
          <input className="mt-1 w-full rounded-lg px-3 py-2 text-slate-900" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </label>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button disabled={loading} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700">
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}