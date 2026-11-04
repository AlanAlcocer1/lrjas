import { useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { anniversary } from '@/content/capsule';
import { createMemory } from '@/services/memoriesApi';
import './ContributeForm.css';

type Props = {
  onCreated: () => void;
};

const MAX_BYTES = 100 * 1024 * 1024;
const DATE_MIN = anniversary.uploadMin;
const DATE_MAX = (() => {
  const today = new Date().toISOString().slice(0, 10);
  return today < anniversary.uploadMax ? today : anniversary.uploadMax;
})();

export function ContributeForm({ onCreated }: Props) {
  const [authorName, setAuthorName] = useState('');
  const [memoryDate, setMemoryDate] = useState('');
  const [caption, setCaption] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const reduce = useReducedMotion();

  const onFile = (file: File | null) => {
    setOk(false);
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    if (!file) {
      setPhoto(null);
      setPreview(null);
      return;
    }
    if (file.type.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv)$/i.test(file.name)) {
      setError('Solo se permiten fotos, no videos');
      setPhoto(null);
      setPreview(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Elige una foto (JPG, PNG o WebP)');
      setPhoto(null);
      setPreview(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('La foto no puede superar 100 MB');
      setPhoto(null);
      setPreview(null);
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!photo) {
      setError('Elige una foto');
      return;
    }
    setSubmitting(true);
    setError(null);
    setOk(false);
    try {
      await createMemory({ authorName, memoryDate, caption, photo });
      setOk(true);
      setAuthorName('');
      setMemoryDate('');
      setCaption('');
      onFile(null);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contribute"
      className="contribute"
      data-tone="light"
      data-chapter="—"
      data-label="Tu recuerdo"
    >
      <motion.div
        className="contribute__intro"
        initial={reduce ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="slate contribute__eyebrow">Cápsula LRJAS</p>
        <h2 className="contribute__title display">
          Deja tu <em>mejor</em> recuerdo
        </h2>
        <p className="contribute__lead">
          Esa foto que siempre te hace sonreír. Súbela al LRJAS para que todas las personas la
          puedan vivir otra vez.
        </p>
      </motion.div>

      <form className="contribute__form" onSubmit={submit}>
        <label className={`contribute__photo ${preview ? 'has-photo' : ''}`}>
          <input
            className="visually-hidden"
            required={!photo}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          {preview ? (
            <img src={preview} alt="Vista previa" className="contribute__preview" />
          ) : (
            <span className="contribute__photo-empty">
              <span className="slate">Tu foto</span>
              <span className="contribute__photo-cta display">Elige una imagen</span>
              <span className="slate contribute__photo-hint">JPG · PNG · WebP</span>
            </span>
          )}
          {preview && <span className="slate contribute__photo-change">Cambiar foto</span>}
        </label>

        <div className="contribute__fields">
          <label className="contribute__field">
            <span className="slate">Tu nombre</span>
            <input
              required
              maxLength={80}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Ej. Ana Pérez"
              autoComplete="name"
            />
          </label>

          <label className="contribute__field">
            <span className="slate">Fecha del recuerdo</span>
            <input
              required
              type="date"
              value={memoryDate}
              min={DATE_MIN}
              max={DATE_MAX}
              onChange={(e) => setMemoryDate(e.target.value)}
            />
          </label>

          <label className="contribute__field">
            <span className="slate">Qué se ve / qué pasó</span>
            <textarea
              required
              maxLength={280}
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Una frase sobre la foto (máx. 280)"
            />
          </label>

          <div aria-live="polite">
            {error && <p className="contribute__error">{error}</p>}
            {ok && <p className="contribute__ok">¡Gracias! Tu recuerdo ya está en la cápsula.</p>}
          </div>

          <button type="submit" className="contribute__submit" disabled={submitting}>
            <span>{submitting ? 'Subiendo…' : 'Publicar recuerdo'}</span>
            <span aria-hidden>→</span>
          </button>
        </div>
      </form>
    </section>
  );
}
