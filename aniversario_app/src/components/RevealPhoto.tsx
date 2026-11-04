import { motion, useReducedMotion, type Variants } from 'framer-motion';
import './RevealPhoto.css';

type Props = {
  src: string;
  alt: string;
  className?: string;
  /** Dirección del barrido: como una cortina que se abre. */
  from?: 'bottom' | 'left' | 'right';
  delay?: number;
};

const hiddenClip = {
  bottom: 'inset(100% 0% 0% 0%)',
  left: 'inset(0% 100% 0% 0%)',
  right: 'inset(0% 0% 0% 100%)',
};

const EASE = [0.65, 0, 0.15, 1] as const;

/** Foto que se "revela" al entrar en cuadro: barrido + ligera desaceleración de escala. */
export function RevealPhoto({ src, alt, className, from = 'bottom', delay = 0 }: Props) {
  const reduce = useReducedMotion();

  const curtain: Variants = {
    hidden: { clipPath: hiddenClip[from] },
    shown: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: 1.4, ease: EASE, delay } },
  };
  const develop: Variants = {
    hidden: { scale: 1.22 },
    shown: { scale: 1, transition: { duration: 2, ease: EASE, delay } },
  };

  // El observador va en el contenedor sin recorte: un elemento con clip-path
  // al 100% no cuenta como visible para IntersectionObserver.
  return (
    <motion.div
      className={`reveal-photo ${className ?? ''}`}
      initial={reduce ? false : 'hidden'}
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
    >
      <motion.div className="reveal-photo__curtain" variants={curtain}>
        <motion.img src={src} alt={alt} loading="lazy" decoding="async" variants={develop} />
      </motion.div>
    </motion.div>
  );
}
