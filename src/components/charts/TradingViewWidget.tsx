import React, { useEffect, useRef } from 'react';

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'dark' | 'light';
  interval?: string;
  containerId?: string;
  className?: string;
  autosize?: boolean;
  hideSideToolbar?: boolean;
  hideTopToolbar?: boolean;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol = 'OANDA:XAUUSD',
  theme = 'dark',
  interval = '15',
  containerId,
  className = '',
  autosize = true,
  hideSideToolbar = false,
  hideTopToolbar = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef(`tv_adv_${Math.random().toString(36).substring(2, 9)}`);
  const effectiveId = containerId || widgetIdRef.current;

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.id = effectiveId;
    widgetDiv.className = 'tradingview-widget-container__widget w-full h-full';
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: autosize,
      symbol: symbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: theme === 'light' ? 'light' : 'dark',
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      withdateranges: true,
      hide_side_toolbar: hideSideToolbar,
      hide_top_toolbar: hideTopToolbar,
      hide_legend: false,
      hide_volume: false,
      save_image: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      container_id: effectiveId
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, theme, interval, effectiveId, autosize, hideSideToolbar, hideTopToolbar]);

  return (
    <div
      className={`tradingview-widget-container w-full h-full relative rounded-xl overflow-hidden border border-border/40 dark:border-white/[0.08] ${className}`}
      style={{ overscrollBehavior: 'contain' }}
      onWheel={(e) => {
        e.stopPropagation();
      }}
    >
      <div ref={containerRef} className="w-full h-full" style={{ overscrollBehavior: 'contain' }} />
    </div>
  );
};

