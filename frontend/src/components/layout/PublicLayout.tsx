import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { SocialFooter } from '@/components/social/SocialFooter';
import type { ReactNode } from 'react';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh gradient-mesh flex flex-col">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4 sm:max-w-2xl lg:max-w-4xl">
          <Link to="/" className="flex items-center gap-2 group transition-opacity hover:opacity-90">
            <Logo variant="isotipo" />
            <Logo variant="imagotipo" className="hidden sm:block h-8" />
          </Link>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-6 sm:max-w-2xl lg:max-w-4xl pb-8">
        {children}
      </main>
      <SocialFooter />
    </div>
  );
}
