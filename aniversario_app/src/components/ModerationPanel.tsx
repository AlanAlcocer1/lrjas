import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import {
  deleteMemory,
  fetchAllMemories,
  unlockModeration,
  type ApiMemory,
} from '@/services/memoriesApi';
import './ModerationPanel.css';

type Props = {
  onChanged: () => void;
};

type Gate = 'closed' | 'ask' | 'open';

function formatDate(iso?: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Botón casi invisible en créditos + modal para borrar fotos indebidas. */
export function ModerationPanel({ onChanged }: Props) {
  const titleId = useId();
  const [gate, setGate] = useState<Gate>('closed');
  const [password, setPassword] = useState('');
  const [unlockedPassword, setUnlockedPassword] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [rows, setRows] = useState<ApiMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      setRows(await fetchAllMemories());
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'No se pudo cargar');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (gate === 'open') void load();
  }, [gate, load]);

  useEffect(() => {
    if (gate === 'closed') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGate('closed');
        setPassword('');
        setGateError(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gate]);

  const submitGate = async (e: FormEvent) => {
    e.preventDefault();
    setGateError(null);
    const pwd = password.trim();
    if (!pwd) {
      setGateError('Escribe la contraseña');
      return;
    }
    setUnlocking(true);
    try {
      await unlockModeration(pwd);
      setUnlockedPassword(pwd);
      setGate('open');
      setPassword('');
    } catch (err) {
      setGateError(err instanceof Error ? err.message : 'Contraseña incorrecta');
    } finally {
      setUnlocking(false);
    }
  };

  const remove = async (row: ApiMemory) => {
    if (!unlockedPassword) return;
    const ok = window.confirm(`¿Eliminar el recuerdo de ${row.authorName}?\n“${row.caption}”`);
    if (!ok) return;
    setBusyId(row.id);
    setListError(null);
    try {
      await deleteMemory(row.id, unlockedPassword);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar';
      setListError(msg);
      if (/contraseña|unauthorized|401/i.test(msg)) {
        setGate('ask');
        setUnlockedPassword('');
        setGateError('Contraseña incorrecta');
      }
    } finally {
      setBusyId(null);
    }
  };

  const close = () => {
    setGate('closed');
    setPassword('');
    setUnlockedPassword('');
    setGateError(null);
    setListError(null);
  };

  return (
    <>
      <button
        type="button"
        className="mod-secret"
        aria-label="Moderación"
        onClick={() => {
          setGate('ask');
          setGateError(null);
          setPassword('');
        }}
      >
        ···
      </button>

      {gate !== 'closed' && (
        <div className="mod-backdrop" role="presentation" onClick={close}>
          <div
            className="mod-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            {gate === 'ask' ? (
              <form className="mod-gate" onSubmit={submitGate}>
                <h2 id={titleId} className="mod-title">
                  Moderación
                </h2>
                <p className="mod-lead">Contraseña para gestionar recuerdos.</p>
                <label className="mod-field">
                  <span>Contraseña</span>
                  <input
                    type="password"
                    autoFocus
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                {gateError && <p className="mod-error">{gateError}</p>}
                <div className="mod-actions">
                  <button type="button" className="mod-btn mod-btn--ghost" onClick={close}>
                    Cancelar
                  </button>
                  <button type="submit" className="mod-btn" disabled={unlocking}>
                    {unlocking ? '…' : 'Entrar'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mod-panel">
                <header className="mod-panel__head">
                  <div>
                    <h2 id={titleId} className="mod-title">
                      Recuerdos cargados
                    </h2>
                    <p className="mod-lead">
                      {loading ? 'Cargando…' : `${rows.length} foto${rows.length === 1 ? '' : 's'}`}
                    </p>
                  </div>
                  <div className="mod-actions">
                    <button type="button" className="mod-btn mod-btn--ghost" onClick={() => void load()}>
                      Recargar
                    </button>
                    <button type="button" className="mod-btn mod-btn--ghost" onClick={close}>
                      Cerrar
                    </button>
                  </div>
                </header>

                {listError && <p className="mod-error">{listError}</p>}

                {!loading && rows.length === 0 ? (
                  <p className="mod-empty">No hay fotos publicadas todavía.</p>
                ) : (
                  <ul className="mod-list">
                    {rows.map((row) => (
                      <li key={row.id} className="mod-card">
                        <img src={row.imageUrl} alt={row.caption} className="mod-card__img" />
                        <div className="mod-card__body">
                          <p className="mod-card__caption">{row.caption}</p>
                          <p className="mod-card__meta">
                            {row.authorName} · {formatDate(row.memoryDate)}
                          </p>
                          <button
                            type="button"
                            className="mod-btn mod-btn--danger"
                            disabled={busyId === row.id}
                            onClick={() => void remove(row)}
                          >
                            {busyId === row.id ? 'Eliminando…' : 'Eliminar'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
