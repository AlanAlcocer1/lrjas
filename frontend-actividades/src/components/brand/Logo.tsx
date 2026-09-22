import { cn } from '@/lib/utils';
import { BRAND } from '@/config/brand';

type LogoVariant = 'imagotipo' | 'isotipo';
type LogoTone = 'green' | 'white';

interface LogoProps {
  variant?: LogoVariant;
  tone?: LogoTone;
  className?: string;
  alt?: string;
}

export function Logo({
  variant = 'imagotipo',
  tone = 'green',
  className,
  alt = 'LRJAS Actividades',
}: LogoProps) {
  const src =
    variant === 'isotipo'
      ? BRAND.images.isotipoGreen
      : tone === 'white'
        ? BRAND.images.imagotipoWhite
        : BRAND.images.imagotipoGreen;

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        variant === 'isotipo' ? 'h-8 w-8 object-contain' : 'h-9 w-auto object-contain',
        className,
      )}
      draggable={false}
    />
  );
}
