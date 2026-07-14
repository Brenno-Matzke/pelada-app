import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import PasswordInput from '../components/PasswordInput';

const REMEMBERED_EMAIL_KEY = 'pelada_remembered_email';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBERED_EMAIL_KEY) || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBERED_EMAIL_KEY));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);

      if (rememberMe) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY);

      navigate('/lista');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col f1 jc" style={{ padding: '32px 28px 40px' }}>
      <div className="col" style={{ gap: 8, marginBottom: 32 }}>
        <div className="h1" style={{ fontSize: 26 }}>Pelada das Abelhas</div>
        <div className="muted fs14">Domingo, 18h · Quadra do bairro</div>
      </div>

      <form onSubmit={handleSubmit} className="col gap16">
        {mode === 'register' && (
          <div className="inputWrap">
            <span className="muted fs12">Nome</span>
            <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="inputWrap">
          <span className="muted fs12">E-mail</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="inputWrap">
          <span className="muted fs12">Senha</span>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {mode === 'login' && (
          <label className="fx ac gap8 fs13 muted" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Lembrar de mim
          </label>
        )}

        {error && <div className="errorText">{error}</div>}

        <div className="col gap12" style={{ marginTop: 12 }}>
          <button className="btn btnPrimary" type="submit" disabled={busy}>
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </div>
      </form>

      {mode === 'login' && (
        <div className="tc" style={{ marginTop: 14 }}>
          <Link to="/esqueci-senha" className="muted fs12" style={{ textDecoration: 'none' }}>
            Esqueci minha senha
          </Link>
        </div>
      )}

      <div className="tc muted fs12" style={{ marginTop: 18 }}>
        {mode === 'login' ? (
          <>
            Ainda não tem conta?{' '}
            <span className="accent fw6" style={{ cursor: 'pointer' }} onClick={() => setMode('register')}>
              Cadastre-se
            </span>
          </>
        ) : (
          <>
            Já tem conta?{' '}
            <span className="accent fw6" style={{ cursor: 'pointer' }} onClick={() => setMode('login')}>
              Entrar
            </span>
          </>
        )}
      </div>
    </div>
  );
}
