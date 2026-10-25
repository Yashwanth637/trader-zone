import React from 'react';

export interface AssetLogoProps {
  symbol: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  className?: string;
  title?: string;
}

/**
 * Normalizes trading symbol for display.
 * Specifically converts XAUUSD and XAUTUSD variations to 'GOLD' in Trade History and throughout the app.
 */
export function formatSymbolDisplay(symbol?: string): string {
  if (!symbol) return '';
  const clean = symbol.toUpperCase().replace(/[\/_]/g, '').trim();

  // Display XAUUSD and XAUTUSD (including broker suffixes like XAUUSDm, XAUUSD.pro, etc.) as GOLD
  if (
    clean.startsWith('XAUUSD') ||
    clean.startsWith('XAUTUSD') ||
    clean === 'XAU' ||
    clean.startsWith('GOLD')
  ) {
    return 'GOLD';
  }

  return symbol;
}

/**
 * Returns a consistent category or canonical key for the symbol
 */
function getCanonicalAsset(symbol?: string): string {
  if (!symbol) return 'UNKNOWN';
  const clean = symbol.toUpperCase().replace(/[\/_]/g, '').trim();

  if (clean.startsWith('XAUUSD') || clean.startsWith('XAUTUSD') || clean === 'XAU' || clean.startsWith('GOLD')) {
    return 'GOLD';
  }
  if (clean.startsWith('ETHUSD') || clean.startsWith('ETHUSDT') || clean.startsWith('ETH')) {
    return 'ETH';
  }
  if (clean.startsWith('BTCUSD') || clean.startsWith('BTCUSDT') || clean.startsWith('BTC')) {
    return 'BTC';
  }
  if (clean.startsWith('SOLUSD') || clean.startsWith('SOLUSDT') || clean.startsWith('SOL')) {
    return 'SOL';
  }
  if (clean.startsWith('EURUSD') || clean.startsWith('EURGBP') || clean.startsWith('EURJPY') || clean.startsWith('EUR')) {
    return 'EUR';
  }
  if (clean.startsWith('GBPUSD') || clean.startsWith('GBPJPY') || clean.startsWith('GBP')) {
    return 'GBP';
  }
  if (clean.startsWith('USDJPY') || clean.startsWith('JPY')) {
    return 'JPY';
  }
  if (clean.startsWith('AUDUSD') || clean.startsWith('AUD')) {
    return 'AUD';
  }
  if (clean.startsWith('USDCAD') || clean.startsWith('CAD')) {
    return 'CAD';
  }
  if (clean.startsWith('USDCHF') || clean.startsWith('CHF')) {
    return 'CHF';
  }
  if (clean.includes('US30') || clean.includes('DJ30') || clean.includes('DJI')) {
    return 'US30';
  }
  if (clean.includes('NAS100') || clean.includes('USTEC') || clean.includes('NQ')) {
    return 'NAS100';
  }
  if (clean.includes('SPX500') || clean.includes('US500') || clean.includes('SP500') || clean.includes('ES')) {
    return 'SPX500';
  }
  if (clean.includes('OIL') || clean.includes('WTI') || clean.includes('BRENT') || clean.includes('CL')) {
    return 'OIL';
  }
  if (clean.startsWith('XAGUSD') || clean.startsWith('XAG') || clean.includes('SILVER')) {
    return 'SILVER';
  }
  if (clean.startsWith('XRP')) {
    return 'XRP';
  }
  if (clean.startsWith('BNB')) {
    return 'BNB';
  }

  return clean;
}

/**
 * Computes a deterministic badge color for arbitrary tickers
 */
function getTickerColor(ticker: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palettes = [
    { bg: '#3B82F6', text: '#FFFFFF' }, // blue
    { bg: '#8B5CF6', text: '#FFFFFF' }, // violet
    { bg: '#EC4899', text: '#FFFFFF' }, // pink
    { bg: '#10B981', text: '#FFFFFF' }, // emerald
    { bg: '#F59E0B', text: '#FFFFFF' }, // amber
    { bg: '#06B6D4', text: '#FFFFFF' }, // cyan
    { bg: '#6366F1', text: '#FFFFFF' }, // indigo
    { bg: '#14B8A6', text: '#FFFFFF' }, // teal
  ];
  return palettes[Math.abs(hash) % palettes.length];
}

export const AssetLogo: React.FC<AssetLogoProps> = ({
  symbol,
  size = 'sm',
  className = '',
  title
}) => {
  const canonical = getCanonicalAsset(symbol);

  // Size dimensions
  let pxSize = 24;
  if (typeof size === 'number') {
    pxSize = size;
  } else {
    switch (size) {
      case 'xs':
        pxSize = 18;
        break;
      case 'sm':
        pxSize = 24;
        break;
      case 'md':
        pxSize = 32;
        break;
      case 'lg':
        pxSize = 40;
        break;
    }
  }

  const tooltipTitle = title || formatSymbolDisplay(symbol);

  const renderSvg = () => {
    // 1. GOLD (Matching Image 3: yellow circle with 3 white gold ingots)
    if (canonical === 'GOLD') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="Gold"
        >
          <circle cx="16" cy="16" r="16" fill="#DF9900" />
          {/* Top gold bar */}
          <polygon
            points="12,9.2 20,9.2 22.4,14 9.6,14"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Bottom left gold bar */}
          <polygon
            points="6.2,16.2 13.8,16.2 15,21 5,21"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Bottom right gold bar */}
          <polygon
            points="18.2,16.2 25.8,16.2 27,21 17,21"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    // 2. ETHEREUM (Matching Image 3: blue circle with official 3D Ethereum crystal diamond)
    if (canonical === 'ETH') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="Ethereum"
        >
          <circle cx="16" cy="16" r="16" fill="#627EEA" />
          <g fill="#FFFFFF">
            <polygon points="16,4 16,13.2 23.5,16.5" fillOpacity="0.6" />
            <polygon points="16,4 8.5,16.5 16,13.2" fillOpacity="1" />
            <polygon points="16,22.2 16,28 23.5,17.8" fillOpacity="0.6" />
            <polygon points="16,28 16,22.2 8.5,17.8" fillOpacity="1" />
            <polygon points="16,20.8 23.5,16.5 16,13.2" fillOpacity="0.2" />
            <polygon points="8.5,16.5 16,20.8 16,13.2" fillOpacity="0.6" />
          </g>
        </svg>
      );
    }

    // 3. BITCOIN
    if (canonical === 'BTC') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="Bitcoin"
        >
          <circle cx="16" cy="16" r="16" fill="#F7931A" />
          <path
            d="M22.5 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.6-.4-.7 2.7c-.4-.1-.7-.2-1.1-.3l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.7.8 1.1l-.8 3.2c.1 0 .1 0 .2.1l-.2-.1-1.1 4.5c-.1.2-.3.6-.8.5 0 0-1.2-.3-1.2-.3l-.9 2 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.6.4.7-2.7c.4.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.7c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1.1 2.1-2.7zm-3.8 5.7c-.5 2.1-4.1 1-5.3.7l.9-3.8c1.2.3 4.9.9 4.4 3.1zm.5-5.8c-.5 1.9-3.5.9-4.5.7l.8-3.4c1 .3 4.2.8 3.7 2.7z"
            fill="#FFFFFF"
          />
        </svg>
      );
    }

    // 4. SOLANA
    if (canonical === 'SOL') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="Solana"
        >
          <circle cx="16" cy="16" r="16" fill="#111827" />
          <path
            d="M8.5 20.2l2.7-2.7c.3-.3.8-.5 1.2-.5h11.1c.7 0 1.1.8.6 1.3l-2.7 2.7c-.3.3-.8.5-1.2.5H9.1c-.7 0-1.1-.8-.6-1.3z"
            fill="url(#sol_grad)"
          />
          <path
            d="M8.5 9.8l2.7-2.7c.3-.3.8-.5 1.2-.5h11.1c.7 0 1.1.8.6 1.3l-2.7 2.7c-.3.3-.8.5-1.2.5H9.1c-.7 0-1.1-.8-.6-1.3z"
            fill="url(#sol_grad)"
          />
          <path
            d="M23.5 15l-2.7 2.7c-.3.3-.8.5-1.2.5H8.5c-.7 0-1.1-.8-.6-1.3l2.7-2.7c.3-.3.8-.5 1.2-.5h11.1c.7 0 1.1.8.6 1.3z"
            fill="url(#sol_grad)"
          />
          <defs>
            <linearGradient id="sol_grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    // 5. EUR
    if (canonical === 'EUR') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="EUR"
        >
          <circle cx="16" cy="16" r="16" fill="#003399" />
          <text
            x="16"
            y="21.5"
            fontSize="17"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            €
          </text>
        </svg>
      );
    }

    // 6. GBP
    if (canonical === 'GBP') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="GBP"
        >
          <circle cx="16" cy="16" r="16" fill="#012169" />
          <text
            x="16"
            y="21.5"
            fontSize="17"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            £
          </text>
        </svg>
      );
    }

    // 7. JPY
    if (canonical === 'JPY') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="JPY"
        >
          <circle cx="16" cy="16" r="16" fill="#BC002D" />
          <text
            x="16"
            y="21.5"
            fontSize="16"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            ¥
          </text>
        </svg>
      );
    }

    // 8. AUD
    if (canonical === 'AUD') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="AUD"
        >
          <circle cx="16" cy="16" r="16" fill="#00843D" />
          <text
            x="16"
            y="20.5"
            fontSize="12"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            A$
          </text>
        </svg>
      );
    }

    // 9. CAD
    if (canonical === 'CAD') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="CAD"
        >
          <circle cx="16" cy="16" r="16" fill="#DC2626" />
          <text
            x="16"
            y="20.5"
            fontSize="12"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            C$
          </text>
        </svg>
      );
    }

    // 10. CHF
    if (canonical === 'CHF') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="CHF"
        >
          <circle cx="16" cy="16" r="16" fill="#D52B1E" />
          <rect x="13.5" y="8" width="5" height="16" fill="#FFFFFF" rx="1" />
          <rect x="8" y="13.5" width="16" height="5" fill="#FFFFFF" rx="1" />
        </svg>
      );
    }

    // 11. US30
    if (canonical === 'US30') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="US30"
        >
          <circle cx="16" cy="16" r="16" fill="#1E3A8A" />
          <text
            x="16"
            y="20.5"
            fontSize="12"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            30
          </text>
        </svg>
      );
    }

    // 12. NAS100
    if (canonical === 'NAS100') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="NAS100"
        >
          <circle cx="16" cy="16" r="16" fill="#0284C7" />
          <text
            x="16"
            y="20.5"
            fontSize="11"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            NQ
          </text>
        </svg>
      );
    }

    // 13. SPX500
    if (canonical === 'SPX500') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="SPX500"
        >
          <circle cx="16" cy="16" r="16" fill="#B91C1C" />
          <text
            x="16"
            y="20.5"
            fontSize="11"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            500
          </text>
        </svg>
      );
    }

    // 14. OIL
    if (canonical === 'OIL') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="OIL"
        >
          <circle cx="16" cy="16" r="16" fill="#1F2937" />
          <path
            d="M16 8 C16 8 10 16 10 19.5 C10 22.8 12.7 25.5 16 25.5 C19.3 25.5 22 22.8 22 19.5 C22 16 16 8 16 8 Z"
            fill="#F59E0B"
          />
        </svg>
      );
    }

    // 15. SILVER
    if (canonical === 'SILVER') {
      return (
        <svg
          viewBox="0 0 32 32"
          width={pxSize}
          height={pxSize}
          className="shrink-0 select-none"
          aria-label="Silver"
        >
          <circle cx="16" cy="16" r="16" fill="#94A3B8" />
          <polygon
            points="12,9.2 20,9.2 22.4,14 9.6,14"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <polygon
            points="6.2,16.2 13.8,16.2 15,21 5,21"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <polygon
            points="18.2,16.2 25.8,16.2 27,21 17,21"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    // Fallback for any other symbol: elegant round profile badge with ticker letters
    const { bg, text } = getTickerColor(canonical);
    const displayLetters = (canonical.length > 3 ? canonical.slice(0, 3) : canonical).toUpperCase();

    return (
      <svg
        viewBox="0 0 32 32"
        width={pxSize}
        height={pxSize}
        className="shrink-0 select-none"
        aria-label={symbol}
      >
        <circle cx="16" cy="16" r="16" fill={bg} />
        <text
          x="16"
          y="20.5"
          fontSize={displayLetters.length > 2 ? '10' : '12'}
          fontWeight="800"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill={text}
          textAnchor="middle"
          letterSpacing="-0.5px"
        >
          {displayLetters}
        </text>
      </svg>
    );
  };

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      title={tooltipTitle}
    >
      {renderSvg()}
    </span>
  );
};
