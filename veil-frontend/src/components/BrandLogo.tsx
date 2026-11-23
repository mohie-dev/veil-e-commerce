import type { HTMLAttributes } from 'react';

interface BrandLogoProps extends HTMLAttributes<HTMLSpanElement> {
  compact?: boolean;
}

export function BrandLogo({ compact = false, className = '', ...props }: BrandLogoProps) {
  return (
    <span className={`brand-logo ${compact ? 'brand-logo-compact' : ''} ${className}`.trim()} {...props}>
      <span className="brand-wordmark">
        <span>V</span>EIL
        <svg className="brand-sillage" viewBox="0 0 42 74" aria-hidden="true">
          <path d="M25 2C8 18 42 25 20 41 3 54 27 59 17 72" />
          <path d="M27 5C13 20 35 26 19 39" />
        </svg>
      </span>
      {!compact && <span className="brand-tagline">LEAVE A TRACE.</span>}
    </span>
  );
}
