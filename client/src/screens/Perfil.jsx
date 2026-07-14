import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { usePelada } from '../PeladaContext';
import { api } from '../api';

const SKILL_LEVELS = ['Iniciante', 'Intermediário', 'Avançado', 'Profissional'];

function initial(name) {
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function Perfil() {
  const { user, logout, refreshUser } = useAuth();
  const { state } = usePelada();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => setName(user?.name || ''), [user?.name]);

  async function saveName() {
    if (!name.trim() || name === user.name) return;
    setSaving(true);
    setError(null);
    try {
      await refreshUserWithProfile({ name });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function setSkillLevel(skillLevel) {
    setError(null);
    try {
      await refreshUserWithProfile({ skillLevel });
    } catch (e) {
      setError(e.message);
    }
  }

  async function refreshUserWithProfile(payload) {
    await api.updateProfile(payload);
    await refreshUser();
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const me = state?.me;
  const myEntry = state?.confirmed.find((p) => p.isMe) || state?.waitlist.find((p) => p.isMe);

  return (
    <div className="col f1" style={{ minHeight: 0, padding: '24px 20px' }}>
      <div className="col ac gap10" style={{ marginBottom: 24 }}>
        <div className="avatar" style={{ width: 72, height: 72, fontSize: 22 }}>{initial(user?.name || '')}</div>
        <div className="h2" style={{ fontSize: 18 }}>{user?.name}</div>
        <div className="muted fs13">{user?.isAdmin ? 'Administrador' : 'Jogador'}</div>
      </div>

      {error && <div className="errorText" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="card col gap10" style={{ marginBottom: 14 }}>
        <div className="fw6 fs14" style={{ marginBottom: 4 }}>Editar perfil</div>
        <div className="inputWrap">
          <span className="muted fs12">Nome</span>
          <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} disabled={saving} />
        </div>
        <div className="col gap8">
          <span className="muted fs12">Nível</span>
          <div className="fx wrap gap8">
            {SKILL_LEVELS.map((lvl) => (
              <button
                key={lvl}
                className={`levelPill ${user?.skillLevel === lvl ? 'levelPillActive' : ''}`}
                onClick={() => setSkillLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card col gap10" style={{ marginBottom: 14 }}>
        <div className="fw6 fs14" style={{ marginBottom: 4 }}>Pelada de domingo</div>
        <div className="fx jb">
          <span className="muted fs13">Status</span>
          <span className={`fw6 fs13 ${me?.status ? 'accent' : 'warn'}`}>
            {me?.status === 'confirmed' ? 'Confirmado' : me?.status === 'waitlist' ? 'Lista de espera' : 'Fora da lista'}
          </span>
        </div>
        <div className="fx jb">
          <span className="muted fs13">Pagamento</span>
          <span className={`fw6 fs13 ${myEntry?.paid ? 'accent' : 'warn'}`}>{myEntry?.paid ? 'Pago' : 'Pendente'}</span>
        </div>
      </div>

      <div className="f1" />
      <button className="btn btnGhost" onClick={handleLogout}>Sair</button>
    </div>
  );
}
