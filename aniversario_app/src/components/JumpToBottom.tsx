import { useEffect, useState } from 'react';
import './JumpToBottom.css';

export function JumpToBottom() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Deja limpio el plano de apertura; aparece en cuanto empieza el recorrido
      const started = window.scrollY > window.innerHeight * 0.4;
      const form = document.getElementById('contribute');
      if (!form) {
        setVisible(started);
        return;
      }
      const rect = form.getBoundingClientRect();
      // Ocultar cuando el formulario ya está a la vista
      setVisible(started && rect.top > window.innerHeight * 0.85);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`jump-bottom slate ${visible ? 'is-visible' : ''}`}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={() => {
        document.getElementById('contribute')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}
    >
      Sube tu recuerdo
      <span aria-hidden>↓</span>
    </button>
  );
}
