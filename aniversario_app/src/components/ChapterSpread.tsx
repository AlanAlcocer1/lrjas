import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import type { MemoryPhoto, Scene } from '@/content/capsule';
import { RevealText } from '@/components/RevealText';
import { RevealPhoto } from '@/components/RevealPhoto';
import './ChapterSpread.css';

type Props = {
  scene: Scene;
  chapter: string;
  photos: MemoryPhoto[];
};

/**
 * Capítulo a doble página: el telón de papel sube sobre el prólogo y
 * presenta dos recuerdos a distinta profundidad (parallax suave).
 */
export function ChapterSpread({ scene, chapter, photos }: Props) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const yNear = useTransform(p, [0, 1], ['10vh', '-14vh']);
  const yFar = useTransform(p, [0, 1], ['4vh', '-4vh']);
  const [lead, second] = photos;

  return (
    <section
      ref={ref}
      className="spread"
      data-tone="light"
      data-chapter={chapter}
      data-label={scene.kicker}
    >
      <header className="spread__head">
        <p className="slate spread__slate">
          <span>Cap. {chapter}</span>
          <span className="spread__rule" aria-hidden />
          <span>{scene.kicker}</span>
        </p>
        <RevealText
          text={scene.title}
          emphasis={scene.emphasis}
          className="spread__title display"
        />
      </header>

      {lead && (
        <motion.figure className="spread__fig spread__fig--lead" style={reduce ? undefined : { y: yNear }}>
          <RevealPhoto src={lead.src} alt={lead.caption} from="right" />
          <figcaption className="slate">
            <span>N° 02</span> {lead.caption}
          </figcaption>
        </motion.figure>
      )}

      {second && (
        <motion.figure className="spread__fig spread__fig--second" style={reduce ? undefined : { y: yFar }}>
          <RevealPhoto src={second.src} alt={second.caption} delay={0.15} />
          <figcaption className="slate">
            <span>N° 03</span> {second.caption}
          </figcaption>
        </motion.figure>
      )}
    </section>
  );
}
