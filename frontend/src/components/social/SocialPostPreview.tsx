import { ExternalLink } from 'lucide-react';
import type { SocialPost } from '@/types';
import { InstagramEmbed } from '@/components/social/InstagramEmbed';
import { FacebookIcon, InstagramIcon } from '@/components/social/SocialLinks';
import { Button } from '@/components/ui/button';

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
          ? 'w-full max-w-[260px] mx-auto rounded-lg overflow-hidden border border-border bg-white'
          : 'w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-border bg-white'
      }
    >
      <iframe
        title={title}
        src={`https://www.facebook.com/plugins/post.php?href=${encoded}&show_text=true&width=500`}
        width="100%"
        height={compact ? 320 : 480}
        style={{ border: 'none', overflow: 'hidden' }}
        scrolling="no"
        allow="encrypted-media"
        loading="lazy"
        className={compact ? 'w-full min-h-[240px]' : 'w-full min-h-[360px]'}
      />
    </div>
  );
}

export function SocialPostPreview({ post, compact }: SocialPostPreviewProps) {
  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {!compact && (
        <p className="text-xs font-medium text-center text-muted-foreground">{post.title}</p>
      )}
      {post.platform === 'INSTAGRAM' ? (
        <InstagramEmbed postUrl={post.postUrl} compact={compact} />
      ) : (
        <FacebookEmbed postUrl={post.postUrl} title={post.title} compact={compact} />
      )}
      <div className="flex justify-center">
        <Button asChild variant="ghost" size="sm" className={compact ? 'gap-1.5 text-[10px] h-7 px-2' : 'gap-2 text-xs h-8'}>
          <a href={post.postUrl} target="_blank" rel="noopener noreferrer">
            {post.platform === 'INSTAGRAM' ? (
              <InstagramIcon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            ) : (
              <FacebookIcon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            )}
            {compact ? 'Ver publicación' : 'Abrir publicación'}
            <ExternalLink className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          </a>
        </Button>
      </div>
    </div>
  );
}
