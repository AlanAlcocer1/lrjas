import { useCallback, useEffect, useId, useState, type FormEvent } from 'react';
import {
  deleteMemory,
  fetchAllMemories,
  fetchCover,
  unlockModeration,
  uploadCover,
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

/** Botón en créditos + modal: portada fija y borrado de recuerdos. */
export function ModerationPanel({ onChanged }: Props) {
  const titleId = useId();
  const [gate, setGate] = useState<Gate>('closed');
  const [password, setPassword] = useState('');
  const [unlockedPassword, setUnlockedPassword] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [cover, setCover] = useState<ApiMemory | null>(null);
  const [rows, setRows] = useState<ApiMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const [coverRow, list] = await Promise.all([fetchCover(), fetchAllMemories()]);
      setCover(coverRow);
      setRows(list);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'No se pudo cargar');
      setCover(null);
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

  const onCoverFile = async (file: File | null) => {
    if (!file || !unlockedPassword) return;
    setCoverBusy(true);
    setListError(null);
    try {
      const row = await uploadCover(unlockedPassword, file);
      setCover(row);
      onChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo subir la portada';
      setListError(msg);
      if (/contraseña|unauthorized|401/i.test(msg)) {
        setGate('ask');
        setUnlockedPassword('');
        setGateError('Contraseña incorrecta');
      }
    } finally {
      setCoverBusy(false);
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
                <p className="mod-lead">Contraseña para gestionar portada y recuerdos.</p>
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
                      Moderación
                    </h2>
                    <p className="mod-lead">
                      {loading
                        ? 'Cargando…'
                        : `${rows.length} recuerdo${rows.length === 1 ? '' : 's'} en capítulos`}
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

                <section className="mod-cover">
                  <h3 className="mod-cover__title">Foto de portada</h3>
                  <p className="mod-cover__hint">
                    Va fija en el prólogo (cuadro verde). No entra en los capítulos ni lleva fecha.
                  </p>
                  <div className="mod-cover__row">
                    {cover ? (
                      <img src={cover.imageUrl} alt="Portada actual" className="mod-cover__img" />
                    ) : (
                      <div className="mod-cover__empty">Sin portada</div>
                    )}
                    <label className="mod-btn mod-cover__upload">
                      {coverBusy ? 'Subiendo…' : cover ? 'Cambiar portada' : 'Subir portada'}
                      <input
                        className="visually-hidden"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={coverBusy}
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          e.target.value = '';
                          void onCoverFile(f);
                        }}
                      />
                    </label>
                  </div>
                </section>

                {!loading && rows.length === 0 ? (
                  <p className="mod-empty">No hay fotos de capítulos todavía.</p>
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
