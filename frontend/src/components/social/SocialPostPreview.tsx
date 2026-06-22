import { useEffect, useState } from 'react';
import { ExternalLink, Maximize2 } from 'lucide-react';
import type { SocialPost } from '@/types';
import { InstagramEmbed } from '@/components/social/InstagramEmbed';
import { FacebookIcon, InstagramIcon } from '@/components/social/SocialLinks';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type SocialPostPreviewProps = {
  post: SocialPost;
  compact?: boolean;
};

function FacebookEmbed({
  postUrl,
  title,
  compact,
}: {
  postUrl: string;
  title: string;
  compact?: boolean;
}) {
  const encoded = encodeURIComponent(postUrl);
  return (
    <div
      className={
        compact
          ? 'w-full max-w-[340px] mx-auto rounded-lg overflow-hidden border border-border bg-white'
          : 'w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-border bg-white'
      }
    >
      <iframe
        title={title}
        src={`https://www.facebook.com/plugins/post.php?href=${encoded}&show_text=true&width=500`}
        width="100%"
        height={compact ? 400 : 480}
        style={{ border: 'none', overflow: 'hidden' }}
        scrolling="no"
        allow="encrypted-media"
        loading="lazy"
        className="w-full"
      />
    </div>
  );
}

function PostEmbed({ post, compact }: { post: SocialPost; compact?: boolean }) {
  if (post.platform === 'INSTAGRAM') {
    return <InstagramEmbed postUrl={post.postUrl} compact={compact} />;
  }
  return <FacebookEmbed postUrl={post.postUrl} title={post.title} compact={compact} />;
}

export function SocialPostPreview({ post, compact }: SocialPostPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const timer = window.setTimeout(() => window.instgrm?.Embeds.process(), 150);
    return () => window.clearTimeout(timer);
  }, [expanded, post.postUrl]);

  return (
    <>
      <div className={compact ? 'space-y-2' : 'space-y-2'}>
        {!compact && (
          <p className="text-xs font-medium text-center text-muted-foreground">{post.title}</p>
        )}
        <PostEmbed post={post} compact={compact} />
        <div className="flex flex-wrap items-center justify-center gap-2">
          {compact && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => setExpanded(true)}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Ver completa
            </Button>
          )}
          <Button asChild variant="ghost" size="sm" className={compact ? 'gap-1.5 text-xs h-8' : 'gap-2 text-xs h-8'}>
            <a href={post.postUrl} target="_blank" rel="noopener noreferrer">
              {post.platform === 'INSTAGRAM' ? (
                <InstagramIcon className="h-3.5 w-3.5" />
              ) : (
                <FacebookIcon className="h-3.5 w-3.5" />
              )}
              Abrir publicación
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] p-4 sm:p-6 max-h-[92dvh] overflow-y-auto">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-base leading-snug">{post.title}</DialogTitle>
          </DialogHeader>
          <PostEmbed post={post} />
        </DialogContent>
      </Dialog>
    </>
  );
}
