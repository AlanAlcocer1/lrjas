import { motion, useReducedMotion } from 'framer-motion';
import { afterBlocks, brand } from '@/content/capsule';
import { ContributeForm } from '@/components/ContributeForm';
import { BaileJas } from '@/components/BaileJas';
import { ModerationPanel } from '@/components/ModerationPanel';
import './AfterReel.css';

type Props = {
  onMemoryCreated: (memoryId?: string) => void | Promise<void>;
  onMemoriesChanged?: () => void;
};

/** Epílogo: lo que nos sostiene, la invitación a sumar un recuerdo y los créditos. */
export function AfterReel({ onMemoryCreated, onMemoriesChanged }: Props) {
  const reduce = useReducedMotion();
  const refresh = onMemoriesChanged ?? (() => void onMemoryCreated());

  return (
    <>
      <section className="epilogue" data-tone="light" data-chapter="—" data-label="Epílogo">
        <header className="epilogue__head">
          <img src={brand.logo} alt={brand.name} className="epilogue__logo" />
          <p className="slate epilogue__slate">Dos años · Epílogo</p>
        </header>

        <ul className="epilogue__list">
          {afterBlocks.map((block) => (
            <motion.li
              key={block.id}
              className="epilogue__row"
              initial={reduce ? false : { opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.span
                className="epilogue__line"
                aria-hidden
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 1.4, ease: [0.65, 0, 0.15, 1] }}
              />
              <p className="slate epilogue__eyebrow">{block.eyebrow}</p>
              <h2 className="epilogue__title display">{block.title}</h2>
              <p className="epilogue__body">{block.body}</p>
            </motion.li>
          ))}
        </ul>
      </section>

      <ContributeForm onCreated={onMemoryCreated} />

      <BaileJas />

      <footer className="credits" data-tone="dark" data-chapter="—" data-label="Créditos">
        <img src={brand.logo} alt={brand.name} className="credits__logo" />
        <p className="credits__years display" aria-label={`${brand.yearStart}${brand.yearEnd}`}>
          <span>{brand.yearStart}</span>
          <em>{brand.yearEnd}</em>
        </p>
        <div className="credits__meta slate">
          <span>{brand.fullName}</span>
          <a href={brand.siteUrl}>{brand.siteUrl.replace(/^https?:\/\//, '')} ↗</a>
        </div>
        <ModerationPanel onChanged={refresh} />
      </footer>
    </>
  );
}
