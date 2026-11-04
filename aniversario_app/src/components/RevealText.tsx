import { Fragment } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import './RevealText.css';

type Props = {
  text: string;
  /** Índices de palabras en itálica. */
  emphasis?: number[];
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  delay?: number;
  /** 'view' = al entrar en pantalla, 'mount' = al cargar (prólogo). */
  trigger?: 'view' | 'mount';
};

const container: Variants = {
  hidden: {},
  show: (delay: number) => ({
    transition: { staggerChildren: 0.07, delayChildren: delay },
  }),
};

const word: Variants = {
  hidden: { y: '105%' },
  show: { y: '0%', transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] } },
};

/**
 * Título que aparece palabra por palabra detrás de una máscara,
 * como un rótulo de cine que sube desde la línea base.
 */
export function RevealText({
  text,
  emphasis = [],
  as: Tag = 'h2',
  className,
  delay = 0,
  trigger = 'view',
}: Props) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  const animate = reduce ? { initial: false as const } : trigger === 'mount'
    ? { initial: 'hidden', animate: 'show' }
    : { initial: 'hidden', whileInView: 'show', viewport: { once: true, amount: 0.5 } };

  return (
    <Tag className={className} aria-label={text}>
      <motion.span className="reveal" variants={container} custom={delay} aria-hidden {...animate}>
        {words.map((w, i) => (
          <Fragment key={`${w}-${i}`}>
            <span className="reveal__mask">
              <motion.span variants={word} className="reveal__word">
                {emphasis.includes(i) ? <em>{w}</em> : w}
              </motion.span>
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </Fragment>
        ))}
      </motion.span>
    </Tag>
  );
}
