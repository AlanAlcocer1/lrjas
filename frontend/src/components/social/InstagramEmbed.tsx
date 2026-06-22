import { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { SOCIAL } from '@/config/social';
import { Button } from '@/components/ui/button';
import { InstagramIcon } from '@/components/social/SocialLinks';

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

type InstagramEmbedProps = {
  postUrl: string;
  compact?: boolean;
};

export function InstagramEmbed({ postUrl, compact }: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!postUrl) return;

    const process = () => window.instgrm?.Embeds.process();

    const existing = document.querySelector('script[src*="instagram.com/embed.js"]');
    if (existing) {
      process();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    script.onload = process;
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [postUrl]);

  if (!postUrl) {
    return (
      <div
        className={
          compact
            ? 'rounded-lg border border-border bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-orange-400/10 p-4 text-center max-w-[260px] mx-auto'
            : 'rounded-xl border border-border bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-orange-400/10 p-6 text-center'
        }
      >
        <div
          className={
            compact
              ? 'mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white'
              : 'mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white'
          }
        >
          <InstagramIcon className={compact ? 'h-4 w-4' : 'h-6 w-6'} />
        </div>
        <p className={compact ? 'text-xs font-medium mb-0.5' : 'text-sm font-medium mb-1'}>{SOCIAL.instagram.handle}</p>
        {!compact && (
          <p className="text-xs text-muted-foreground mb-4">Fotos, avisos y dinámicas en Instagram</p>
        )}
        <Button asChild variant="outline" size="sm" className={compact ? 'gap-1.5 h-7 text-[10px] mt-2' : 'gap-2'}>
          <a href={SOCIAL.instagram.url} target="_blank" rel="noopener noreferrer">
            Ver perfil
            <ExternalLink className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={
        compact
          ? 'w-full max-w-[340px] mx-auto rounded-lg'
          : 'w-full max-w-sm mx-auto overflow-hidden rounded-xl'
      }
    >
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink={postUrl}
        data-instgrm-version="14"
        style={{
          background: '#FFF',
          border: 0,
          borderRadius: '12px',
          margin: 0,
          maxWidth: '100%',
          minWidth: '280px',
          width: '100%',
        }}
      />
    </div>
  );
}
