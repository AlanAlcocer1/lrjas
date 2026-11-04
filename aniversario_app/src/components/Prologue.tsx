import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { brand, type MemoryPhoto, type Scene } from '@/content/capsule';
import { RevealText } from '@/components/RevealText';
import { ramp } from '@/lib/ramp';
import './Prologue.css';

type Props = {
  scene: Scene;
  photo?: MemoryPhoto;
  loading?: boolean;
};

/**
 * Prólogo: la cápsula se abre. Una ventana pequeña en la oscuridad deja ver el
 * primer recuerdo; al desplazar, la ventana se expande hasta llenar la pantalla
 * y los años (20 · 26) se separan hacia los bordes, como una puerta que se abre.
 */
export function Prologue({ scene, photo, loading }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  const clipPath = useTransform(p, (v) => {
    const k = 1 - ramp(v, 0, 0.55, 0, 1);
    const ease = k * k * (3 - 2 * k);
    const vy = `calc(${50 * ease}% - ${21 * ease}vh)`;
    const vx = `calc(${50 * ease}% - ${16.8 * ease}vh)`;
    return `inset(${vy} ${vx} ${vy} ${vx})`;
  });
  const imgScale = useTransform(p, [0, 0.6], [1.35, 1]);
  const scrim = useTransform(p, (v) => ramp(v, 0.45, 0.62, 0.35, 0.05));
  const titleY = useTransform(p, [0, 0.35], ['0vh', '-14vh']);
  const titleOpacity = useTransform(p, (v) => ramp(v, 0.1, 0.3, 1, 0));
  const yearLeft = useTransform(p, [0, 0.5], ['0vw', '-40vw']);
  const yearRight = useTransform(p, [0, 0.5], ['0vw', '40vw']);
  const captionOpacity = useTransform(p, (v) => ramp(v, 0.5, 0.62, 0, 1));
  const cueOpacity = useTransform(p, (v) => ramp(v, 0, 0.06, 1, 0));

  const still = reduce ?? false;

  return (
    <section
      ref={ref}
      className="prologue"
      data-tone="dark"
      data-chapter="00"
      data-label="Prólogo"
      aria-label={scene.kicker}
    >
      <div className="prologue__stage">
        <motion.div
          className="prologue__aperture"
          style={still ? undefined : { clipPath }}
          aria-hidden={!photo}
        >
          {photo && !loading && (
            <motion.img
              src={photo.src}
              alt={photo.caption}
              style={still ? undefined : { scale: imgScale }}
              fetchPriority="high"
            />
          )}
          <motion.div className="prologue__scrim" style={{ opacity: still ? 0.35 : scrim }} />
        </motion.div>

        <motion.span
          className="prologue__year prologue__year--start display"
          style={still ? undefined : { x: yearLeft }}
          aria-hidden
        >
          {brand.yearStart}
        </motion.span>
        <motion.span
          className="prologue__year prologue__year--end display"
          style={still ? undefined : { x: yearRight }}
          aria-hidden
        >
          {brand.yearEnd}
        </motion.span>

        <motion.div
          className="prologue__titles"
          style={still ? undefined : { y: titleY, opacity: titleOpacity }}
        >
          <motion.img
            src={brand.logoWhite}
            alt={brand.fullName}
            className="prologue__logo"
            initial={still ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          />
          <motion.p
            className="prologue__kicker slate"
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            {scene.kicker}
          </motion.p>
          <RevealText
            as="h1"
            text={scene.title}
            emphasis={scene.emphasis}
            className="prologue__title display"
            trigger="mount"
            delay={0.6}
          />
        </motion.div>

        {photo && (
          <motion.p
            className="prologue__caption slate"
            style={{ opacity: still ? 1 : captionOpacity }}
          >
            <span>N° 01</span>
            <span>{photo.caption}</span>
          </motion.p>
        )}

        <motion.p className="prologue__cue slate" style={{ opacity: cueOpacity }} aria-hidden>
          Desliza para abrir la cápsula
          <span className="prologue__cue-line" />
        </motion.p>
      </div>
    </section>
  );
}
