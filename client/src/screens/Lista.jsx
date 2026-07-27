import { useState } from 'react';
import { usePelada } from '../PeladaContext';
import { useAuth } from '../AuthContext';

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Small round avatar — tapping it (photo or just initials) toggles an
 *  inline preview (see PhotoPreview) instead of jumping straight to
 *  fullscreen — the fullscreen view is one more tap away, from the preview. */
function Avatar({ person, onClick, style, bg }) {
  return (
    <button
      type="button"
      className="avatar"
      style={{ padding: 0, border: 'none', cursor: 'pointer', ...(bg ? { background: bg } : null), ...style }}
      onClick={onClick}
      aria-label={`Ver perfil de ${person.name}`}
    >
      {person.avatarUrl ? (
        <img src={person.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        person.initial
      )}
    </button>
  );
}

/** Inline "a bit bigger" preview shown below a row when its avatar is
 *  tapped — name and level, plus either the photo (tapping it opens the
 *  true fullscreen lightbox) or, for players without one, just a bigger
 *  initials circle with nothing further to open. */
function PhotoPreview({ person, subtitle, onOpenFull }) {
  return (
    <div className="fx ac gap12" style={{ padding: '2px 0 14px 0' }}>
      {person.avatarUrl ? (
        <button
          type="button"
          onClick={onOpenFull}
          aria-label={`Ampliar foto de ${person.name}`}
          style={{
            padding: 0,
            border: 'none',
            cursor: 'pointer',
            borderRadius: 12,
            overflow: 'hidden',
            width: 84,
            height: 84,
            flexShrink: 0,
          }}
        >
          <img src={person.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </button>
      ) : (
        <div className="avatar" style={{ width: 84, height: 84, fontSize: 26, flexShrink: 0 }}>
          {person.initial}
        </div>
      )}
      <div className="col gap4">
        <span className="fw6 fs16">{person.name}</span>
        <span className="muted fs13">{subtitle}</span>
      </div>
    </div>
  );
}

function PhotoLightbox({ person, onClose }) {
  if (!person) return null;
  return (
    <div
      onClick={onClose}
      className="col ac jc gap12"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, padding: 24 }}
    >
      <img
        src={person.avatarUrl}
        alt={person.name}
        style={{ maxWidth: '85vw', maxHeight: '70vh', borderRadius: 16, objectFit: 'contain' }}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="fw6 fs16" style={{ color: '#fff' }}>{person.name}</div>
    </div>
  );
}

export default function Lista() {
  const { user } = useAuth();
  const { state, loading, error, confirm, cancel, assignTeam, generateTeams, clearAllTeams, clearTeam } = usePelada();
  const [view, setView] = useState('confirmados'); // 'confirmados' | 'times'
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [viewingPhoto, setViewingPhoto] = useState(null);

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
              <div key={p.id}>
                <div className="rowline">
                  <Avatar
                    person={p}
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  />
                  <div className="f1 col" style={{ gap: 2 }}>
                    <span className="fw6 fs14">{p.name}{p.isMe ? ' (você)' : ''}</span>
                    <span className="muted fs11">{p.levelLabel}</span>
                  </div>
                  <span className="badge btnPrimary">Confirmado</span>
                </div>
                {expandedId === p.id && (
                  <PhotoPreview person={p} subtitle={p.levelLabel} onOpenFull={() => setViewingPhoto(p)} />
                )}
              </div>
            ))}
            {waitlist.length > 0 && (
              <>
                <div className="fs12 fw7 upper muted" style={{ margin: '16px 0 4px' }}>Lista de espera</div>
                {waitlist.map((w) => (
                  <div key={w.id}>
                    <div className="rowline">
                      <Avatar
                        person={w}
                        bg="oklch(0.24 0.012 260)"
                        onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                      />
                      <div className="f1 col" style={{ gap: 2 }}>
                        <span className="fw6 fs14">{w.name}{w.isMe ? ' (você)' : ''}</span>
                        <span className="muted fs12">Aguardando vaga</span>
                      </div>
                    </div>
                    {expandedId === w.id && (
                      <PhotoPreview person={w} subtitle="Aguardando vaga" onOpenFull={() => setViewingPhoto(w)} />
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
          <div style={{ padding: '12px 20px 16px' }}>
            {pelada.cancelada ? (
              <div className="btn btnGhost warn" style={{ opacity: 0.8, cursor: 'default' }}>
                Pelada cancelada essa semana
              </div>
            ) : pelada.listaAberta ? (
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

      <PhotoLightbox person={viewingPhoto} onClose={() => setViewingPhoto(null)} />
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
