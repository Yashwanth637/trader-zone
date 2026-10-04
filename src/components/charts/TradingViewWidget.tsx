import React, { useMemo } from 'react';

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'dark' | 'light';
  interval?: string;
  className?: string;
  autosize?: boolean;
  hideSideToolbar?: boolean;
  hideTopToolbar?: boolean;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol = 'OANDA:XAUUSD',
  theme = 'dark',
  interval = '15',
  className = '',
  autosize = true,
  hideSideToolbar = false,
  hideTopToolbar = false
}) => {
  // Construct direct TradingView Advanced Chart embed URL (bulletproof across all browsers & lifecycle)
  const iframeSrc = useMemo(() => {
    const config = {
      autosize: autosize,
      symbol: symbol,
      interval: interval,
      timezone: 'Etc/UTC',
      theme: theme === 'light' ? 'light' : 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      withdateranges: true,
      hide_side_toolbar: hideSideToolbar,
      hide_top_toolbar: hideTopToolbar,
      hide_legend: false,
      hide_volume: false,
      save_image: true,
      calendar: false,
      support_host: 'https://www.tradingview.com'
    };

    return `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=en#${encodeURIComponent(
      JSON.stringify(config)
    )}`;
  }, [symbol, theme, interval, autosize, hideSideToolbar, hideTopToolbar]);

  return (
    <div
      className={`tradingview-widget-container w-full h-full relative rounded-xl overflow-hidden border border-border/40 dark:border-white/[0.08] bg-surface flex flex-col ${className}`}
      style={{ width: '100%', height: '100%', overscrollBehavior: 'contain' }}
      onWheel={(e) => {
        // Prevent wheel events from bubbling up and scrolling parent pages
        e.stopPropagation();
      }}
    >
      <iframe
        key={`${symbol}_${theme}_${interval}`}
        title={`TradingView Advanced Chart - ${symbol}`}
        src={iframeSrc}
        className="w-full h-full flex-1 block border-0"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        allow="clipboard-write"
        allowTransparency={true}
        scrolling="no"
      />
    </div>
  );
};


