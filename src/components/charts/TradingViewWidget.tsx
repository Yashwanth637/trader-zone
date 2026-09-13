import React, { useEffect, useRef } from 'react';

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'dark' | 'light';
  interval?: string;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({
  symbol = 'OANDA:XAUUSD',
  theme = 'dark',
  interval = '15'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: theme === 'light' ? 'light' : 'dark',
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      withdateranges: true,
      hide_side_toolbar: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: true,
      save_image: true,
      studies: [],
      container_id: "tradingview_widget_container"
    });

    containerRef.current.appendChild(script);
  }, [symbol, theme, interval]);

  return (
    <div className="w-full h-full min-h-[550px] relative rounded-xl overflow-hidden border border-border">
      <div id="tradingview_widget_container" ref={containerRef} className="w-full h-full" />
    </div>
  );
};
