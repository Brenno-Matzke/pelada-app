import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col f1 jc" style={{ padding: '32px 28px 40px' }}>
      <div className="col" style={{ gap: 8, marginBottom: 32 }}>
        <div className="h1" style={{ fontSize: 22 }}>Esqueci minha senha</div>
        <div className="muted fs14">
          Digite seu e-mail e mandamos um link para redefinir sua senha.
        </div>
      </div>

      {sent ? (
        <div className="card col gap8">
          <div className="fw6 fs14">Link enviado!</div>
          <div className="muted fs13">
            Se esse e-mail estiver cadastrado, você vai receber um link em instantes. Confira também a caixa de spam.
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="col gap16">
          <div className="inputWrap">
            <span className="muted fs12">E-mail</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && <div className="errorText">{error}</div>}
          <button className="btn btnPrimary" type="submit" disabled={busy}>
            Enviar link de redefinição
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
