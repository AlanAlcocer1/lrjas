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
};

export function InstagramEmbed({ postUrl }: InstagramEmbedProps) {
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
      <div className="rounded-xl border border-border bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-orange-400/10 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white">
          <InstagramIcon className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium mb-1">{SOCIAL.instagram.handle}</p>
        <p className="text-xs text-muted-foreground mb-4">Fotos, avisos y dinámicas en Instagram</p>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <a href={SOCIAL.instagram.url} target="_blank" rel="noopener noreferrer">
            Ver perfil
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full max-w-sm mx-auto overflow-hidden rounded-xl">
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
