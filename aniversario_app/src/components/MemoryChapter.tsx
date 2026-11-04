import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { chapterStories } from '@/content/capsule';
import type { MemoryChapter as Chapter } from '@/lib/chapters';
import { RevealText } from '@/components/RevealText';
import { RevealPhoto } from '@/components/RevealPhoto';
import './MemoryChapter.css';

type Props = {
  chapter: Chapter;
};

const pad = (n: number) => String(n).padStart(2, '0');

function formatDate(iso?: string) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Un capítulo de la cápsula: texto propio + fotos al mismo tamaño. */
export function MemoryChapter({ chapter }: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const total = chapter.memories.length;
  const story =
    chapterStories[chapter.index - 1] ??
    ({ title: 'Celebramos dos años', body: '', emphasis: [1] } as const);

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
  }, [chapter.memories]);

  return (
    <section
      className={`mem-chapter${chapter.index % 2 === 0 ? ' mem-chapter--alt' : ''}`}
      data-tone="light"
      data-chapter={chapter.roman}
      data-label={story.title}
    >
      <aside className="mem-chapter__index">
        <div className="mem-chapter__index-inner">
          <p className="slate mem-chapter__slate">
            <span>Cap. {chapter.roman}</span>
            <span className="mem-chapter__rule" aria-hidden />
            <span>{chapter.rangeLabel}</span>
          </p>
          <RevealText
            text={story.title}
            emphasis={story.emphasis}
            className="mem-chapter__title display"
          />
          {story.body ? <p className="mem-chapter__body">{story.body}</p> : null}
          {total > 0 && (
            <p className="mem-chapter__counter" aria-live="off">
              <span className="mem-chapter__counter-now display">{pad(active + 1)}</span>
              <span className="slate">/ {pad(total)}</span>
            </p>
          )}
        </div>
      </aside>

      {total === 0 ? (
        <p className="mem-chapter__empty slate">
          Aún no hay fotos en este capítulo. Sé el primero en dejar un recuerdo.
        </p>
      ) : (
        <ol ref={listRef} className="mem-chapter__list">
          {chapter.memories.map((m, i) => {
            const date = formatDate(m.memoryDate);
            const author = m.authorName?.trim();
            return (
              <li key={m.id} className="mem-chapter__item" data-index={i}>
                <figure className="mem-chapter__fig">
                  <RevealPhoto
                    src={m.src}
                    alt={m.caption}
                    from={i % 2 === 0 ? 'bottom' : 'left'}
                  />
                  <motion.figcaption
                    className="mem-chapter__caption"
                    initial={reduce ? false : { opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="mem-chapter__text">{m.caption}</span>
                    <span className="mem-chapter__meta">
                      {author ? <span className="mem-chapter__author">{author}</span> : null}
                      {author && date ? <span aria-hidden> · </span> : null}
                      {date ? (
                        <time className="mem-chapter__date" dateTime={m.memoryDate}>
                          {date}
                        </time>
                      ) : null}
                    </span>
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
