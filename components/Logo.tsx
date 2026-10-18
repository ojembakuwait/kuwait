/**
 * Cardone Capital brand lockup, reconstructed as inline SVG (navy "C" ring +
 * wordmark) so no third-party asset is embedded. Branding is configurable via
 * NEXT_PUBLIC_BRAND_NAME; swap this component to use a licensed logo asset.
 */
export function Logo({ className = '' }: { className?: string }) {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'CARDONE';
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-label={`${brand} Capital`}>
      <svg width="52" height="52" viewBox="0 0 100 100" role="img" aria-hidden="true">
        <path
          d="M50 8a42 42 0 1 0 30 71l-9-9a29.5 29.5 0 1 1 0-40l9-9A41.8 41.8 0 0 0 50 8Z"
          fill="#13294b"
        />
        <path d="M63 34l12-6-3 14-13 2z" fill="#13294b" />
      </svg>
      <div className="leading-none">
        <div className="text-[22px] font-extrabold tracking-tight text-brand-navy">
          {brand}
          <span className="align-super text-[9px]">®</span>
        </div>
        <div className="mt-0.5 text-[11px] font-semibold tracking-[0.42em] text-brand-navy">
          CAPITAL
        </div>
      </div>
    </div>
  );
}
