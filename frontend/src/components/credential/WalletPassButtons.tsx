/** Botones con estilo cercano a las badges oficiales de Apple / Google Wallet. */

type Props = {
  onApple: () => void;
  onGoogle: () => void;
  disabled?: boolean;
  showApple?: boolean;
  showGoogle?: boolean;
};

export function AddToAppleWalletButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Añadir a Apple Wallet"
      className="inline-flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[10px] bg-black px-4 text-white transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {/* Marca Apple + Wallet (aproximación al badge oficial) */}
      <svg viewBox="0 0 36 24" className="h-7 w-10 shrink-0" aria-hidden>
        <rect width="36" height="24" rx="4" fill="#fff" opacity="0.12" />
        <path
          fill="#fff"
          d="M14.2 7.1c.55-.67.92-1.6.82-2.53-.79.03-1.75.53-2.32 1.2-.51.59-.96 1.54-.84 2.44.89.07 1.8-.45 2.34-1.11zm.7 1.15c-1.24-.07-2.3.7-2.89.7-.6 0-1.51-.67-2.49-.65-1.28.02-2.46.74-3.12 1.89-1.33 2.3-.35 5.71.96 7.58.64.92 1.4 1.94 2.4 1.9 1.02-.04 1.4-.65 2.63-.65s1.57.65 2.65.63c1.1-.02 1.79-.93 2.46-1.85.77-1.13 1.09-2.22 1.11-2.28-.02-.01-2.13-.82-2.15-3.24-.02-2.03 1.66-3 1.73-3.05-.96-1.41-2.44-1.56-2.96-1.59l-.33.01z"
        />
        <path
          fill="#fff"
          d="M22.5 8.2h1.35l1.55 4.35h.05l1.55-4.35H28.3l-2.25 5.9h-1.3l-2.25-5.9zm7.1 0h1.25v5.9H29.6V8.2z"
        />
      </svg>
      <span className="flex flex-col items-start leading-none text-left">
        <span className="text-[9px] font-medium tracking-wide opacity-90">Añadir a</span>
        <span className="text-[16px] font-semibold tracking-tight">Apple Wallet</span>
      </span>
    </button>
  );
}

export function SaveToGoogleWalletButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Guardar en Google Wallet"
      className="inline-flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[10px] border border-[#dadce0] bg-white px-4 text-[#1f1f1f] shadow-sm transition hover:bg-[#f8f9fa] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {/* Escudo multicolor al estilo Google Wallet */}
      <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden>
        <path fill="#34A853" d="M12 2L4 5.5v5.2C4 15.7 7.4 20.2 12 21.5c4.6-1.3 8-5.8 8-10.8V5.5L12 2z" />
        <path fill="#FBBC04" d="M12 4.1L6 6.7v3.9c0 3.5 2 6.8 5.1 8.3L12 4.1z" opacity=".9" />
        <path fill="#EA4335" d="M12 4.1l6 2.6v3.9c0 .9-.1 1.7-.4 2.5L12 10.2V4.1z" />
        <path fill="#4285F4" d="M12 12.5l5.1 3.1A8.4 8.4 0 0112 19.5a8.4 8.4 0 01-5.1-3.9L12 12.5z" />
        <path fill="#fff" d="M10.2 11.4h3.6v1.1h-1.25v3.2h-1.1v-3.2H10.2v-1.1z" />
      </svg>
      <span className="flex flex-col items-start leading-none text-left">
        <span className="text-[9px] font-medium tracking-wide text-[#5f6368]">Guardar en</span>
        <span className="text-[16px] font-semibold tracking-tight">Google Wallet</span>
      </span>
    </button>
  );
}

export function WalletPassButtons({
  onApple,
  onGoogle,
  disabled,
  showApple = true,
  showGoogle = true,
}: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {showApple && <AddToAppleWalletButton onClick={onApple} disabled={disabled} />}
      {showGoogle && <SaveToGoogleWalletButton onClick={onGoogle} disabled={disabled} />}
    </div>
  );
}
