import { usePelada } from '../PeladaContext';

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function Pagamento() {
  const { state, loading, error, togglePaid, togglePreviousPaid } = usePelada();

  if (loading) return <div className="loadingScreen">Carregando…</div>;
  if (!state) return <div className="loadingScreen errorText">{error || 'Erro ao carregar'}</div>;

  const { pelada, confirmed, confirmedCount, paidCount, previous } = state;

  return (
    <div className="col f1" style={{ minHeight: 0 }}>
      <div className="headerBar">
        <div className="col gap4">
          <div className="h2" style={{ fontSize: 20 }}>Pagamento</div>
          <div className="muted fs13">Pelada de {formatDate(pelada.date)}</div>
        </div>
        <div className="pill">{paidCount}/{confirmedCount}</div>
      </div>
      <div className="scroll" style={{ padding: '0 20px 12px' }}>
        {error && <div className="errorText" style={{ marginBottom: 8 }}>{error}</div>}
        {confirmed.map((p) => (
          <div className="rowline" key={p.id}>
            <div className="avatar">{p.initial}</div>
            <div className="f1 col" style={{ gap: 2 }}>
              <span className="fw6 fs14">{p.name}</span>
            </div>
            {p.isMe ? (
              <button className={`smallBtn ${p.paid ? 'btnPrimary' : 'warnBg warn'}`} onClick={() => togglePaid()}>
                {p.paid ? 'Pago' : 'Confirmar pagamento'}
              </button>
            ) : (
              <span className={`badge ${p.paid ? 'btnPrimary' : 'warnBg warn'}`}>{p.paid ? 'Pago' : 'Pendente'}</span>
            )}
          </div>
        ))}
        {confirmed.length === 0 && <div className="muted fs13">Ninguém confirmado ainda</div>}

        {previous && (
          <>
            <div className="fx jb ac" style={{ margin: '20px 0 4px' }}>
              <span className="fs12 fw7 upper muted">Pagamento da pelada de {formatDate(previous.date)}</span>
              <span className="pill">{previous.paidCount}/{previous.confirmedCount}</span>
            </div>
            {previous.confirmed.map((p) => (
              <div className="rowline" key={p.id}>
                <div className="avatar">{p.initial}</div>
                <div className="f1 col" style={{ gap: 2 }}>
                  <span className="fw6 fs14">{p.name}</span>
                </div>
                {p.isMe ? (
                  <button
                    className={`smallBtn ${p.paid ? 'btnPrimary' : 'warnBg warn'}`}
                    onClick={() => togglePreviousPaid()}
                  >
                    {p.paid ? 'Pago' : 'Confirmar pagamento'}
                  </button>
                ) : (
                  <span className={`badge ${p.paid ? 'btnPrimary' : 'warnBg warn'}`}>
                    {p.paid ? 'Pago' : 'Pendente'}
                  </span>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
