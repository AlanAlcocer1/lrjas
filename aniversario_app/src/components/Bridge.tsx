import { useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import type { Scene } from '@/content/capsule';
import { ramp } from '@/lib/ramp';
import './Bridge.css';

type Props = {
  scene: Scene;
};

function Word({
  progress,
  range,
  children,
  emphasis,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  children: string;
  emphasis: boolean;
}) {
  const opacity = useTransform(progress, (v) => ramp(v, range[0], range[1], 0.14, 1));
  const Inner = emphasis ? 'em' : 'span';
  return (
    <motion.span className="bridge__word" style={{ opacity }}>
      <Inner>{children}</Inner>{' '}
    </motion.span>
  );
}

/**
 * Puente hacia el epílogo: la frase se "escribe" con la luz a medida que
 * el visitante avanza, palabra por palabra.
 */
export function Bridge({ scene }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const words = scene.title.split(' ');
  const kickerOpacity = useTransform(p, (v) => ramp(v, 0, 0.1, 0.3, 1));

  return (
    <section
      ref={ref}
      className={`bridge ${reduce ? 'bridge--still' : ''}`}
      data-tone="dark"
      data-chapter="—"
      data-label={scene.kicker}
    >
      <div className="bridge__stage">
        <motion.p className="slate bridge__kicker" style={reduce ? undefined : { opacity: kickerOpacity }}>
          {scene.kicker}…
        </motion.p>
        <h2 className="bridge__title display" aria-label={scene.title}>
          <span aria-hidden>
            {words.map((w, i) => {
              const start = 0.1 + (i / words.length) * 0.65;
              return reduce ? (
                <span key={i} className="bridge__word">
                  {scene.emphasis?.includes(i) ? <em>{w}</em> : w}{' '}
                </span>
              ) : (
                <Word
                  key={i}
                  progress={p}
                  range={[start, start + 0.65 / words.length]}
                  emphasis={scene.emphasis?.includes(i) ?? false}
                >
                  {w}
                </Word>
              );
            })}
          </span>
        </h2>
      </div>
    </section>
  );
}
