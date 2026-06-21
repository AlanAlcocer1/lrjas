import { ExternalLink } from 'lucide-react';
import type { SocialPost } from '@/types';
import { InstagramEmbed } from '@/components/social/InstagramEmbed';
import { FacebookIcon, InstagramIcon } from '@/components/social/SocialLinks';
import { Button } from '@/components/ui/button';

type SocialPostPreviewProps = {
  post: SocialPost;
};

function FacebookEmbed({ postUrl, title }: { postUrl: string; title: string }) {
  const encoded = encodeURIComponent(postUrl);
  return (
    <div className="w-full max-w-sm mx-auto rounded-xl overflow-hidden border border-border bg-white">
      <iframe
        title={title}
        src={`https://www.facebook.com/plugins/post.php?href=${encoded}&show_text=true&width=500`}
        width="100%"
        height="480"
        style={{ border: 'none', overflow: 'hidden' }}
        scrolling="no"
        allow="encrypted-media"
        loading="lazy"
        className="w-full min-h-[360px]"
      />
    </div>
  );
}

export function SocialPostPreview({ post }: SocialPostPreviewProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-center text-muted-foreground">{post.title}</p>
      {post.platform === 'INSTAGRAM' ? (
        <InstagramEmbed postUrl={post.postUrl} />
      ) : (
        <FacebookEmbed postUrl={post.postUrl} title={post.title} />
      )}
      <div className="flex justify-center">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-xs h-8">
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
  );
}
