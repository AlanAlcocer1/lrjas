import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { MemoryPhoto, Scene } from '@/content/capsule';
import { RevealText } from '@/components/RevealText';
import { RevealPhoto } from '@/components/RevealPhoto';
import './Archive.css';

type Props = {
  scene: Scene;
  chapter: string;
  memories: MemoryPhoto[];
  loading?: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');

function formatDate(iso?: string) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d.slice(0, 2)}.${m}.${y}`;
}

/**
 * Archivo vivo: todos los recuerdos que sube la comunidad, montados como
 * un libro de fotografía. En escritorio, el índice queda fijo a la izquierda
 * y cuenta el recuerdo que está en cuadro.
 */
export function Archive({ scene, chapter, memories, loading }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    list.querySelectorAll('[data-index]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [memories, loading]);

  return (
    <section
      id="archivo"
      className="archive"
      data-tone="light"
      data-chapter={chapter}
      data-label={scene.kicker}
    >
      <aside className="archive__index">
        <div className="archive__index-inner">
          <p className="slate archive__slate">
            <span>Cap. {chapter}</span>
            <span className="archive__rule" aria-hidden />
            <span>{scene.kicker}</span>
          </p>
          <RevealText text={scene.title} emphasis={scene.emphasis} className="archive__title display" />
          {!loading && memories.length > 0 && (
            <p className="archive__counter" aria-live="off">
              <span className="archive__counter-now display">{pad(active + 1)}</span>
              <span className="slate">/ {pad(memories.length)} recuerdos</span>
            </p>
          )}
        </div>
      </aside>

      {loading ? (
        <p className="archive__loading slate">Cargando recuerdos…</p>
      ) : (
        <ol ref={listRef} className="archive__list">
          {memories.map((m, i) => {
            const date = formatDate(m.memoryDate);
            return (
              <li key={m.id} className="archive__item" data-index={i}>
                <figure className="archive__fig">
                  <RevealPhoto
                    src={m.src}
                    alt={m.caption}
                    from={i % 3 === 1 ? 'left' : 'bottom'}
                  />
                  <motion.figcaption
                    className="archive__caption"
                    initial={reduce ? false : { opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="slate archive__no">
                      N° {pad(i + 1)}
                      {date ? <> · {date}</> : null}
                    </span>
                    <span className="archive__text">{m.caption}</span>
                    {m.authorName && <span className="slate archive__author">{m.authorName}</span>}
                  </motion.figcaption>
                </figure>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
