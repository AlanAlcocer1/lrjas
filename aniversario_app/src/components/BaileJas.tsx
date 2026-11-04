import { motion, useReducedMotion } from 'framer-motion';
import { baileJas } from '@/content/capsule';
import { RevealText } from '@/components/RevealText';
import './BaileJas.css';

function youtubeEmbedSrc(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  try {
    const u = new URL(url);
    let id = '';
    if (u.hostname.includes('youtu.be')) {
      id = u.pathname.replace(/^\//, '').split('/')[0] || '';
    } else if (u.pathname.startsWith('/embed/')) {
      id = u.pathname.split('/')[2] || '';
    } else if (u.pathname.startsWith('/shorts/')) {
      id = u.pathname.split('/')[2] || '';
    } else {
      id = u.searchParams.get('v') || '';
    }
    if (!id || !/^[\w-]{6,}$/.test(id)) return null;
    // modestbranding / rel: menos chrome de canal; el overlay CSS tapa título/usuario arriba
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3`;
  } catch {
    return null;
  }
}

const ease = [0.16, 1, 0.3, 1] as const;

/** Invitación al LRJAS FEST + frame de YouTube. */
export function BaileJas() {
  const reduce = useReducedMotion();
  const embed = youtubeEmbedSrc(baileJas.youtubeUrl);

  return (
    <section
      id="lrjas-fest"
      className="baile"
      data-tone="dark"
      data-chapter="—"
      data-label="LRJAS FEST"
    >
      <div className="baile__glow" aria-hidden />
      <motion.div
        className="baile__inner"
        initial={reduce ? false : 'hidden'}
        whileInView="show"
        viewport={{ once: true, amount: 0.28 }}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
        }}
      >
        <motion.p
          className="slate baile__eyebrow"
          variants={
            reduce
              ? undefined
              : {
                  hidden: { opacity: 0, y: 18 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
                }
          }
        >
          <motion.span
            className="baile__badge"
            animate={
              reduce
                ? undefined
                : {
                    boxShadow: [
                      '0 0 0 0 rgba(132, 189, 49, 0.0)',
                      '0 0 28px 2px rgba(132, 189, 49, 0.45)',
                      '0 0 0 0 rgba(132, 189, 49, 0.0)',
                    ],
                  }
            }
            transition={reduce ? undefined : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            {baileJas.eyebrow}
          </motion.span>
          <span className="baile__rule" aria-hidden />
          <span>{baileJas.dateLabel}</span>
        </motion.p>

        <motion.div
          variants={
            reduce
              ? undefined
              : {
                  hidden: { opacity: 0, y: 28, scale: 0.96 },
                  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.9, ease } },
                }
          }
        >
          <RevealText
            text={baileJas.title}
            emphasis={baileJas.emphasis}
            className="baile__title display"
          />
        </motion.div>

        <motion.p
          className="baile__body"
          variants={
            reduce
              ? undefined
              : {
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
                }
          }
        >
          {baileJas.body}
        </motion.p>

        <motion.div
          className="baile__frame"
          variants={
            reduce
              ? undefined
              : {
                  hidden: { opacity: 0, y: 40, scale: 0.94 },
                  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 1, ease } },
                }
          }
        >
          {embed ? (
            <iframe
              className="baile__video"
              src={embed}
              title="LRJAS FEST — aniversario"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="baile__placeholder slate">Pronto el video del LRJAS FEST</div>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
