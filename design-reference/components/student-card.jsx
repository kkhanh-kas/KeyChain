// Student Card modal
function StudentCard({ onClose, ownedCount, joined }) {
  const { wallet, disconnect } = useWallet();
  const [name, setName] = useState(() => localStorage.getItem('kc-name') || 'Curator');
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function commit() {
    localStorage.setItem('kc-name', name);
    setEditing(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="student-card" onClick={e => e.stopPropagation()}>
        <div className="student-card__head">
          <span className="student-card__title">KeyChain · Member Card</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="student-card__body">
          <div className="student-card__avatar">
            <Mascot size={100} />
          </div>
          <div className="student-card__fields">
            <div className="student-card__field">
              <span className="student-card__label">Name</span>
              {editing ? (
                <input ref={inputRef} className="student-card__field-input" autoFocus
                  value={name} onChange={e => setName(e.target.value)}
                  onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()}/>
              ) : (
                <span className="student-card__val serif" onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>{name}</span>
              )}
            </div>
            <div className="student-card__field">
              <span className="student-card__label">Role</span>
              <span className="student-card__val">Customer</span>
            </div>
            <div className="student-card__field">
              <span className="student-card__label">Wallet</span>
              <span className="student-card__val">{wallet.address ? `${wallet.address.slice(0,6)}…${wallet.address.slice(-4)}` : '—'}</span>
            </div>
            <div className="student-card__field">
              <span className="student-card__label">Balance</span>
              <span className="student-card__val">{wallet.keyBalance.toLocaleString()} KEY</span>
            </div>
            <div className="student-card__field">
              <span className="student-card__label">Games</span>
              <span className="student-card__val">{ownedCount} owned</span>
            </div>
            <div className="student-card__field">
              <span className="student-card__label">Joined</span>
              <span className="student-card__val">{joined}</span>
            </div>
          </div>
        </div>
        <div className="student-card__stub">
          <div>
            <div className="eyebrow" style={{ color: 'var(--text-secondary)' }}>Member since 2026</div>
            <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', color: 'var(--accent-primary)' }}>{wallet.address ? wallet.address.slice(0,18) + '…' : '—'}</div>
          </div>
          <div className="student-card__stub-actions">
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>Edit Profile</button>
            <button className="btn btn-danger" onClick={() => { disconnect(); onClose(); }}>Disconnect</button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.StudentCard = StudentCard;
