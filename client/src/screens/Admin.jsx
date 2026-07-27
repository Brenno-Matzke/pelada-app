import { useEffect, useState } from 'react';
import { usePelada } from '../PeladaContext';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import TimeField from '../components/TimeField';

export default function Admin() {
  const { user: me } = useAuth();
  const {
    state,
    loading,
    error,
    updatePelada,
    togglePlayerPaid,
    removePlayer,
    promoteWaitlist,
    cancelPelada,
  } = usePelada();

  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  async function handleCancelPelada() {
    const sure = window.confirm(
      'Cancelar a pelada dessa semana? Todo mundo confirmado e na lista de espera será removido, e a lista fica bloqueada até você reabrir pra próxima semana.'
    );
    if (!sure) return;
    setCancelling(true);
    try {
      await cancelPelada();
    } catch (e) {
      // surfaced via context error state
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    api
      .listUsers()
      .then((data) => setUsers(data.users))
      .catch((e) => setUsersError(e.message));
  }, []);

  async function toggleAdmin(user) {
    setUsersError(null);
    setBusyUserId(user.id);
    try {
      const data = await api.setUserAdmin(user.id, !user.isAdmin);
      setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
    } catch (e) {
      setUsersError(e.message);
    } finally {
      setBusyUserId(null);
    }
  }

  if (loading) return <div className="loadingScreen">Carregando…</div>;
  if (!state) return <div className="loadingScreen errorText">{error || 'Erro ao carregar'}</div>;

  const { pelada, confirmed, waitlist, confirmedCount, paidCount, perPerson } = state;

  return (
    <div className="col f1" style={{ minHeight: 0 }}>
      <div className="headerBar"><div className="h2" style={{ fontSize: 20 }}>Painel do admin</div></div>
      <div className="scroll" style={{ padding: '0 20px 12px' }}>
        {error && <div className="errorText" style={{ marginBottom: 8 }}>{error}</div>}

        <div className="card col gap10" style={{ marginBottom: 16 }}>
          <div className="fw6 fs14">Pelada de domingo</div>
          <div className="fx jb ac">
            <span className="muted fs13">Data</span>
            <input
              className="input"
              type="date"
              style={{ width: 150, padding: '8px 10px' }}
              value={pelada.date}
              onChange={(e) => updatePelada({ date: e.target.value })}
            />
          </div>
          <div className="fx jb ac">
            <span className="muted fs13">Início</span>
            <TimeField value={pelada.startTime} onChange={(v) => updatePelada({ startTime: v })} />
          </div>
          <div className="fx jb ac">
            <span className="muted fs13">Fim</span>
            <TimeField value={pelada.endTime} onChange={(v) => updatePelada({ endTime: v })} />
          </div>
          <div className="fx jb ac">
            <span className="muted fs13">Valor total</span>
            <div className="fx ac gap8">
              <span className="fw6 fs13">R$</span>
              <input
                className="input"
                type="number"
                step="1"
                min="0"
                style={{ width: 90, padding: '8px 10px' }}
                value={pelada.totalValue}
                onChange={(e) => updatePelada({ totalValue: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="fx jb">
            <span className="muted fs13">Por pessoa (auto)</span>
            <span className="fw6 fs13 accent">R$ {perPerson.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="fx jb">
            <span className="muted fs13">Pagamentos</span>
            <span className="fw6 fs13 accent">{paidCount}/{confirmedCount}</span>
          </div>
          <div className="fx jb ac">
            <span className="muted fs13">Lista de presença</span>
            <button
              className={`levelPill ${pelada.listaAberta ? 'levelPillActive' : ''}`}
              onClick={() => updatePelada({ listaAberta: !pelada.listaAberta })}
            >
              {pelada.listaAberta ? 'Aberta' : 'Fechada'}
            </button>
          </div>
          {pelada.cancelada ? (
            <div className="fx jb ac">
              <span className="warn fs13 fw6">Pelada cancelada essa semana</span>
              <span className="muted fs12">Reabra a lista pra desfazer</span>
            </div>
          ) : (
            <button
              className="smallBtn btnGhost"
              style={{ color: 'oklch(0.7 0.15 30)', alignSelf: 'flex-start' }}
              onClick={handleCancelPelada}
              disabled={cancelling}
            >
              Cancelar pelada da semana
            </button>
          )}
        </div>

        <div className="fs12 fw7 upper muted" style={{ margin: '6px 0 8px' }}>Jogadores confirmados</div>
        {confirmed.map((p) => (
          <div className="rowline" key={p.id}>
            <div className="avatar">{p.initial}</div>
            <div className="f1 col" style={{ gap: 2 }}>
              <span className="fw6 fs14">{p.name}</span>
              <span className="muted fs12">{p.oweLabel}</span>
            </div>
            <button
              className={`smallBtn ${p.paid ? 'btnPrimary' : 'warnBg warn'}`}
              onClick={() => togglePlayerPaid(p.id)}
            >
              {p.paid ? 'Pago' : 'Marcar pago'}
            </button>
            <button
              className="smallBtn btnGhost"
              style={{ marginLeft: 8, color: 'oklch(0.7 0.15 30)' }}
              onClick={() => removePlayer(p.id)}
            >
              Remover
            </button>
          </div>
        ))}

        {waitlist.length > 0 && (
          <>
            <div className="fs12 fw7 upper muted" style={{ margin: '16px 0 8px' }}>Lista de espera</div>
            {waitlist.map((w) => (
              <div className="rowline" key={w.id}>
                <div className="avatar" style={{ background: 'oklch(0.24 0.012 260)' }}>{w.initial}</div>
                <div className="f1 col"><span className="fw6 fs14">{w.name}</span></div>
                <button
                  className="smallBtn btnPrimary"
                  style={{ color: 'oklch(0.14 0.02 155)' }}
                  onClick={() => promoteWaitlist(w.id)}
                >
                  Chamar
                </button>
              </div>
            ))}
          </>
        )}

        <div className="fs12 fw7 upper muted" style={{ margin: '16px 0 8px' }}>Administradores</div>
        {usersError && <div className="errorText" style={{ marginBottom: 8 }}>{usersError}</div>}
        <div className="card col gap4">
          {users.map((u) => (
            <div className="rowline" key={u.id}>
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                {u.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="f1 col" style={{ gap: 2 }}>
                <span className="fw6 fs14">{u.name}{u.id === me?.id ? ' (você)' : ''}</span>
                <span className="muted fs11">{u.email}</span>
              </div>
              <button
                className={`smallBtn ${u.isAdmin ? 'btnGhost' : 'btnPrimary'}`}
                style={u.isAdmin ? { color: 'oklch(0.7 0.15 30)' } : { color: 'oklch(0.14 0.02 155)' }}
                disabled={busyUserId === u.id}
                onClick={() => toggleAdmin(u)}
              >
                {u.isAdmin ? 'Remover admin' : 'Tornar admin'}
              </button>
            </div>
          ))}
          {users.length === 0 && !usersError && <div className="muted fs13">Carregando usuários…</div>}
        </div>
      </div>
    </div>
  );
}
