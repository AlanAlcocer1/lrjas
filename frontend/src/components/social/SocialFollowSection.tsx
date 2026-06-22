import { useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/badge';
import { socialApi } from '@/services/api';
import { SocialLinks } from '@/components/social/SocialLinks';
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
    <Card className="border-leaf/20 bg-white/80 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3 text-center">
        <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-leaf/10">
          <Share2 className="h-4 w-4 text-leaf-dark" />
        </div>
        <CardTitle className="text-base sm:text-lg">Síguenos en redes</CardTitle>
        <p className="text-xs text-muted-foreground font-normal mt-1">
          Avisos, fotos y canal de WhatsApp de LR-JAS Mérida
        </p>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <SocialLinks size="lg" showLabels />

        {loading ? (
          <Skeleton className="h-48 w-full max-w-sm mx-auto rounded-xl" />
        ) : post ? (
          <SocialPostPreview post={post} />
        ) : (
          <InstagramEmbed postUrl={SOCIAL.instagramFeaturedPostUrl} />
        )}
      </CardContent>
    </Card>
  );
}
