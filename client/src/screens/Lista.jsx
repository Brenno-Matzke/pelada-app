import { useState } from 'react';
import { usePelada } from '../PeladaContext';
import { useAuth } from '../AuthContext';

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function Lista() {
  const { user } = useAuth();
  const { state, loading, error, confirm, cancel, assignTeam, generateTeams, clearAllTeams, clearTeam } = usePelada();
  const [view, setView] = useState('confirmados'); // 'confirmados' | 'times'
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="loadingScreen">Carregando…</div>;
  if (!state) return <div className="loadingScreen errorText">{error || 'Erro ao carregar'}</div>;

  const { pelada, confirmed, waitlist, teams, confirmedCount, me } = state;
  const meConfirmed = me?.status === 'confirmed';
  const meWaitlisted = me?.status === 'waitlist';

  async function handleToggleConfirm() {
    setBusy(true);
    try {
      if (me) await cancel();
      else await confirm();
    } catch (e) {
      // surfaced via context error state
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col f1" style={{ minHeight: 0 }}>
      <div className="headerBar">
        <div className="col gap4">
          <div className="h2" style={{ fontSize: 20 }}>Próxima pelada</div>
          <div className="muted fs13">
            {formatDate(pelada.date)} · {pelada.startTime}–{pelada.endTime}
          </div>
        </div>
        <div className="pill">{confirmedCount}/{pelada.capacity}</div>
      </div>

      <div className="fx gap8" style={{ padding: '0 20px 12px' }}>
        <button
          className={`tabChip ${view === 'confirmados' ? 'tabChipActive' : ''}`}
          onClick={() => setView('confirmados')}
        >
          Confirmados
        </button>
        <button className={`tabChip ${view === 'times' ? 'tabChipActive' : ''}`} onClick={() => setView('times')}>
          Times
        </button>
      </div>

      {error && <div className="errorText" style={{ padding: '0 20px 8px' }}>{error}</div>}

      {view === 'confirmados' && (
        <>
          <div className="scroll" style={{ padding: '0 20px 12px' }}>
            <div className="fs12 fw7 upper muted" style={{ margin: '6px 0 4px' }}>Confirmados</div>
            {confirmed.map((p) => (
              <div className="rowline" key={p.id}>
                <div className="avatar">{p.initial}</div>
                <div className="f1 col" style={{ gap: 2 }}>
                  <span className="fw6 fs14">{p.name}{p.isMe ? ' (você)' : ''}</span>
                  <span className="muted fs11">{p.levelLabel}</span>
                </div>
                <span className="badge btnPrimary">Confirmado</span>
              </div>
            ))}
            {waitlist.length > 0 && (
              <>
                <div className="fs12 fw7 upper muted" style={{ margin: '16px 0 4px' }}>Lista de espera</div>
                {waitlist.map((w) => (
                  <div className="rowline" key={w.id}>
                    <div className="avatar" style={{ background: 'oklch(0.24 0.012 260)' }}>{w.initial}</div>
                    <div className="f1 col" style={{ gap: 2 }}>
                      <span className="fw6 fs14">{w.name}{w.isMe ? ' (você)' : ''}</span>
                      <span className="muted fs12">Aguardando vaga</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          <div style={{ padding: '12px 20px 16px' }}>
            {pelada.listaAberta ? (
              <button
                className={`btn ${meConfirmed || meWaitlisted ? 'btnGhost' : 'btnPrimary'}`}
                onClick={handleToggleConfirm}
                disabled={busy}
              >
                {meConfirmed || meWaitlisted ? 'Cancelar minha presença' : 'Confirmar minha presença'}
              </button>
            ) : (
              <div className="btn btnGhost" style={{ opacity: 0.6, cursor: 'default' }}>
                Lista fechada pelo admin
              </div>
            )}
          </div>
        </>
      )}

      {view === 'times' && (
        <>
          <div className="scroll" style={{ padding: '0 20px 12px' }}>
            {teams.map((team) => (
              <TeamCard
                key={team.number}
                team={team}
                confirmed={confirmed}
                isAdmin={user?.isAdmin}
                assignTeam={assignTeam}
                clearTeam={clearTeam}
              />
            ))}
          </div>
          {user?.isAdmin && (
            <div className="col gap8" style={{ padding: '4px 20px 16px' }}>
              <button className="btn btnGhost" onClick={() => generateTeams()}>🎲 Gerar times aleatórios</button>
              <button
                className="btn btnGhost"
                style={{ color: 'oklch(0.7 0.15 30)' }}
                onClick={() => clearAllTeams()}
              >
                🗑️ Limpar todos os times
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TeamCard({ team, confirmed, isAdmin, assignTeam, clearTeam }) {
  const [editing, setEditing] = useState(false);
  const assignedIds = new Set(confirmed.filter((p) => p.teamNumber).map((p) => p.id));
  const available = confirmed.filter((p) => !assignedIds.has(p.id));

  return (
    <div className="card col gap10" style={{ marginBottom: 14 }}>
      <div className="fx jb ac">
        <span className="h2 fs16">{team.label}</span>
        <div className="fx ac gap8">
          <span className="pill">{team.countLabel}</span>
          {isAdmin && team.members.length > 0 && (
            <button
              type="button"
              aria-label={`Limpar ${team.label}`}
              onClick={() => clearTeam(team.number)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                color: 'oklch(0.7 0.15 30)',
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              🗑️
            </button>
          )}
        </div>
      </div>
      {team.members.map((m) => (
        <div className="rowline" key={m.id}>
          <div className="avatar">{m.initial}</div>
          <div className="f1 col" style={{ gap: 2 }}>
            <span className="fw6 fs14">{m.name}</span>
            <span className="muted fs11">{m.levelLabel}</span>
          </div>
          {isAdmin && editing && (
            <button
              className="smallBtn btnGhost"
              style={{ color: 'oklch(0.7 0.15 30)' }}
              onClick={() => assignTeam(m.id, null)}
            >
              Remover
            </button>
          )}
        </div>
      ))}
      {team.members.length === 0 && <div className="muted fs13">Nenhum jogador ainda</div>}

      {isAdmin && (
        <>
          <button className="smallBtn btnPrimary" style={{ color: 'oklch(0.14 0.02 155)' }} onClick={() => setEditing((v) => !v)}>
            {editing ? 'Concluir' : 'Selecionar jogadores'}
          </button>
          {editing && (
            <>
              <div className="fs12 fw7 upper muted" style={{ marginTop: 8 }}>Adicionar jogador</div>
              {available.length === 0 && <div className="muted fs13">Sem jogadores disponíveis</div>}
              {available.map((av) => (
                <div className="rowline" key={av.id}>
                  <div className="avatar" style={{ background: 'oklch(0.24 0.012 260)' }}>{av.initial}</div>
                  <div className="f1 fs14">{av.name}</div>
                  <button className="smallBtn btnGhost" onClick={() => assignTeam(av.id, team.number)}>+ Adicionar</button>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
