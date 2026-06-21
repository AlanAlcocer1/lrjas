import { SocialLinks } from '@/components/social/SocialLinks';

export function SocialFooter() {
  return (
    <footer className="border-t border-border/80 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto max-w-lg px-4 py-5 sm:max-w-2xl lg:max-w-4xl">
        <p className="text-center text-xs font-medium text-muted-foreground mb-3">Síguenos</p>
        <SocialLinks size="sm" />
      </div>
    </footer>
  );
}
