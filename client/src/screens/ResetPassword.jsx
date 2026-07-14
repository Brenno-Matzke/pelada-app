import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import PasswordInput from '../components/PasswordInput';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Link inválido — falta o token. Peça um novo link de redefinição.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setBusy(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col f1 jc" style={{ padding: '32px 28px 40px' }}>
      <div className="col" style={{ gap: 8, marginBottom: 32 }}>
        <div className="h1" style={{ fontSize: 22 }}>Redefinir senha</div>
        <div className="muted fs14">Escolha uma nova senha para sua conta.</div>
      </div>

      {done ? (
        <div className="card col gap8">
          <div className="fw6 fs14">Senha redefinida!</div>
          <div className="muted fs13">Te levando para o login…</div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="col gap16">
          <div className="inputWrap">
            <span className="muted fs12">Nova senha</span>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="inputWrap">
            <span className="muted fs12">Confirmar nova senha</span>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
              autoComplete="new-password"
            />
          </div>
          {error && <div className="errorText">{error}</div>}
          <button className="btn btnPrimary" type="submit" disabled={busy}>
            Redefinir senha
          </button>
        </form>
      )}

      <div className="tc muted fs12" style={{ marginTop: 18 }}>
        <Link to="/login" className="accent fw6" style={{ textDecoration: 'none' }}>
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
