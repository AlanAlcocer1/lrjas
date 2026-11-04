import { useLayoutEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import type { MemoryPhoto, Scene } from '@/content/capsule';
import { RevealText } from '@/components/RevealText';
import { ramp } from '@/lib/ramp';
import './FilmStrip.css';

type Props = {
  scene: Scene;
  chapter: string;
  memories: MemoryPhoto[];
};

const MAX_FRAMES = 14;

/**
 * "Recapitulamos el camino": el scroll vertical arrastra una tira de película
 * en horizontal. Cada cuadro es un recuerdo; el camino se ve pasar.
 */
export function FilmStrip({ scene, chapter, memories }: Props) {
  const ref = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const distance = useMotionValue(0);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => distance.set(Math.max(0, track.scrollWidth - window.innerWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [distance, memories.length]);

  const x = useTransform([p, distance], ([v, d]: number[]) => {
    const t = Math.min(1, Math.max(0, (v - 0.12) / 0.83));
    return -t * d;
  });
  const titleOpacity = useTransform(p, (v) => ramp(v, 0.55, 0.85, 1, 0.25));
  const frames = memories.slice(0, MAX_FRAMES);

  return (
    <section
      ref={ref}
      className={`strip ${reduce ? 'strip--still' : ''}`}
      data-tone="dark"
      data-chapter={chapter}
      data-label={scene.kicker}
    >
      <div className="strip__stage">
        <motion.header className="strip__head" style={reduce ? undefined : { opacity: titleOpacity }}>
          <p className="slate strip__slate">
            <span>Cap. {chapter}</span>
            <span className="strip__rule" aria-hidden />
            <span>{scene.kicker}</span>
          </p>
          <RevealText text={scene.title} emphasis={scene.emphasis} className="strip__title display" />
        </motion.header>

        <motion.div ref={trackRef} className="strip__track" style={reduce ? undefined : { x }}>
          {frames.map((m, i) => (
            <figure key={m.id} className="strip__frame">
              <div className="strip__img">
                <img src={m.src} alt={m.caption} loading="lazy" decoding="async" />
              </div>
              <figcaption className="slate">
                <span>{String(i + 1).padStart(2, '0')}</span>
                {m.memoryDate ? <span>{m.memoryDate.slice(0, 4)}</span> : null}
              </figcaption>
            </figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
