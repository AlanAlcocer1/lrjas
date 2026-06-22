import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/badge';
import { socialApi } from '@/services/api';
import { InstagramEmbed } from '@/components/social/InstagramEmbed';
import { SocialPostPreview } from '@/components/social/SocialPostPreview';
import { SOCIAL } from '@/config/social';
import type { SocialPost } from '@/types';

export function SocialFollowSection() {
  const [post, setPost] = useState<SocialPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    socialApi
      .getFeed()
      .then((items) => setPost(items[0] ?? null))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="border-leaf/15 bg-white/70 backdrop-blur-sm overflow-hidden shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <p className="text-[11px] sm:text-xs font-medium text-center text-muted-foreground mb-3 line-clamp-2">
          {post?.title ?? 'Publicación destacada'}
        </p>

        {loading ? (
          <Skeleton className="h-36 w-full max-w-[260px] mx-auto rounded-lg" />
        ) : post ? (
          <SocialPostPreview post={post} compact />
        ) : (
          <InstagramEmbed postUrl={SOCIAL.instagramFeaturedPostUrl} compact />
        )}
      </CardContent>
    </Card>
  );
}
