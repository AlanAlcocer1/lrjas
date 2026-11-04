/**
 * Interpolación lineal acotada de `v` entre [a, b] → [from, to].
 * Se usa en funciones de `useTransform` para que Framer Motion calcule los
 * valores en JS: la aceleración nativa (ScrollTimeline) desincroniza los
 * escenarios sticky de esta página.
 */
export function ramp(v: number, a: number, b: number, from: number, to: number) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return from + (to - from) * t;
}
