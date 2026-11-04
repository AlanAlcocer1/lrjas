import { useEffect, useState } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { brand } from '@/content/capsule';
import './Hud.css';

type Tone = 'dark' | 'light';
type Active = { tone: Tone; chapter: string; label: string };

const FPS = 24;
/** Duración simbólica del "metraje": todo el recorrido equivale a 12 minutos. */
const RUNTIME_SECONDS = 12 * 60;

function timecode(progress: number) {
  const totalFrames = Math.round(progress * RUNTIME_SECONDS * FPS);
  const f = totalFrames % FPS;
  const s = Math.floor(totalFrames / FPS) % 60;
  const m = Math.floor(totalFrames / FPS / 60);
  return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

/**
 * Interfaz de visor de cámara: marca LR·JAS, capítulo en curso, timecode
 * y una línea de progreso que va de "20" a "26". Cambia de tinta según la
 * escena (clara u oscura) que esté bajo el visor.
 */
export function Hud() {
  const [active, setActive] = useState<Active>({ tone: 'dark', chapter: '00', label: 'Prólogo' });
  const [bottomTone, setBottomTone] = useState<Tone>('dark');
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const tc = useTransform(scrollYProgress, timecode);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // Lo que está "bajo" la barra superior. Si dos escenas se solapan
      // (telón sobre el prólogo), gana la última en el documento: es la que va encima.
      const line = window.innerHeight * 0.05;
      const low = window.innerHeight * 0.95;
      let el: HTMLElement | null = null;
      let lowEl: HTMLElement | null = null;
      document.querySelectorAll<HTMLElement>('[data-tone]').forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) el = s;
        if (r.top <= low && r.bottom > low) lowEl = s;
      });
      if (lowEl) setBottomTone((lowEl as HTMLElement).dataset.tone === 'light' ? 'light' : 'dark');
      if (!el) return;
      const { tone, chapter = '', label = '' } = (el as HTMLElement).dataset;
      setActive((prev) =>
        prev.chapter === chapter && prev.label === label && prev.tone === tone
          ? prev
          : { tone: tone === 'light' ? 'light' : 'dark', chapter, label },
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="hud" aria-hidden>
      <div className={`hud__top hud--${active.tone} slate`}>
        <span className="hud__brand">
          {brand.cornerBottomLeft}
          <i>·</i>
          {brand.cornerBottomRight}
        </span>
        <span className="hud__chapter">
          <span className="hud__chapter-no">{active.chapter}</span>
          <span className="hud__chapter-label">{active.label}</span>
        </span>
      </div>
      <div className={`hud__bottom hud--${bottomTone} slate`}>
        <span>{brand.yearStart}</span>
        <span className="hud__track">
          <motion.span className="hud__fill" style={{ scaleX: progress }} />
        </span>
        <span>{brand.yearEnd}</span>
        <motion.span className="hud__tc">{tc}</motion.span>
      </div>
    </div>
  );
}
