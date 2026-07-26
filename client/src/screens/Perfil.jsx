import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { usePelada } from '../PeladaContext';
import { api } from '../api';
import { pushSupported, getCurrentSubscription, subscribeToPush, unsubscribeFromPush } from '../push';

const SKILL_LEVELS = ['Iniciante', 'Intermediário', 'Avançado', 'Profissional'];

function initial(name) {
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

/** Downscale + compress a picked image client-side before sending it to the
 *  API, so a full-resolution gallery photo doesn't turn into a multi-MB
 *  request body. */
function resizeImageToDataUrl(file, maxSize = 256, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo não é uma imagem válida'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function Perfil() {
  const { user, logout, refreshUser } = useAuth();
  const { state } = usePelada();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => setName(user?.name || ''), [user?.name]);

  useEffect(() => {
    if (!pushSupported()) return;
    getCurrentSubscription().then((sub) => setPushEnabled(!!sub));
  }, []);

  async function togglePush() {
    setError(null);
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        await subscribeToPush();
        setPushEnabled(true);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setPushBusy(false);
    }
  }

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

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again later
    if (!file) return;

    setError(null);
    setUploadingPhoto(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await refreshUserWithProfile({ avatarUrl: dataUrl });
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto() {
    setError(null);
    try {
      await refreshUserWithProfile({ avatarUrl: null });
    } catch (e) {
      setError(e.message);
    }
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
        <label
          style={{
            position: 'relative',
            width: 72,
            height: 72,
            cursor: 'pointer',
            opacity: uploadingPhoto ? 0.6 : 1,
          }}
        >
          <div className="avatar" style={{ width: 72, height: 72, fontSize: 22 }}>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              initial(user?.name || '')
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            disabled={uploadingPhoto}
            style={{ display: 'none' }}
          />
          <span
            className="fx ac jc"
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'oklch(0.78 0.16 155)',
              fontSize: 12,
            }}
          >
            📷
          </span>
        </label>
        {user?.avatarUrl && (
          <button
            className="muted fs12"
            style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={removePhoto}
          >
            Remover foto
          </button>
        )}
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
        <div className="fw6 fs14" style={{ marginBottom: 4 }}>Notificações</div>
        {pushSupported() ? (
          <div className="fx jb ac">
            <span className="muted fs13">Avisos da pelada</span>
            <button
              className={`levelPill ${pushEnabled ? 'levelPillActive' : ''}`}
              onClick={togglePush}
              disabled={pushBusy}
            >
              {pushEnabled ? 'Ativadas' : 'Desativadas'}
            </button>
          </div>
        ) : (
          <div className="muted fs13">
            Esse navegador não suporta notificações (no iPhone, precisa instalar o app na tela de início primeiro).
          </div>
        )}
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
