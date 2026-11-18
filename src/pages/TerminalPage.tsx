import React, { useEffect, useRef } from 'react';
import { KLineChartPro, SymbolInfo, Period } from '@simahfud/klinecharts-pro';
import '@simahfud/klinecharts-pro/dist/klinecharts-pro.css';
import { binanceDatafeed } from '../lib/binanceDatafeed';

export const TerminalPage: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<KLineChartPro | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Default symbol: BTCUSDT on Binance
    const defaultSymbol: SymbolInfo = {
      ticker: 'BTCUSDT',
      name: 'BTC/USDT',
      shortName: 'BTC',
      pricePrecision: 2,
      volumePrecision: 4,
      exchange: 'Binance',
      market: 'crypto',
      priceCurrency: 'USDT',
      type: 'crypto'
    };

    // Default timeframe: 1H
    const defaultPeriod: Period = {
      multiplier: 1,
      timespan: 'hour',
      text: '1H'
    };

    // Timeframe switcher items: 1m, 5m, 15m, 1h, 4h, 1D, 1W
    const periods: Period[] = [
      { multiplier: 1, timespan: 'minute', text: '1m' },
      { multiplier: 5, timespan: 'minute', text: '5m' },
      { multiplier: 15, timespan: 'minute', text: '15m' },
      { multiplier: 1, timespan: 'hour', text: '1h' },
      { multiplier: 4, timespan: 'hour', text: '4h' },
      { multiplier: 1, timespan: 'day', text: '1D' },
      { multiplier: 1, timespan: 'week', text: '1W' }
    ];

    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: any = null;

    try {
      // Initialize TradingView-style KLineChartPro with English locale and dark theme
      const chart = new KLineChartPro({
        container: chartContainerRef.current,
        theme: 'dark',
        locale: 'en-US', // Explicit English locale for all toolbars, menus & settings
        symbol: defaultSymbol,
        period: defaultPeriod,
        periods,
        datafeed: binanceDatafeed,
        chartType: 'candle_solid',
        mainIndicators: ['EMA'],
        subIndicators: ['VOL'],
        drawingBarVisible: true,
        watermark: ''
      });

      chartInstanceRef.current = chart;

      const triggerResize = () => {
        try {
          const widget = chart.getWidget?.();
          if (widget) {
            widget.resize();
          }
          window.dispatchEvent(new Event('resize'));
        } catch (_) {}
      };

      // Ensure multiple resize cycles after layout paint
      requestAnimationFrame(() => triggerResize());
      setTimeout(triggerResize, 50);
      setTimeout(triggerResize, 150);
      setTimeout(triggerResize, 350);
      setTimeout(triggerResize, 700);

      if (chart.ready) {
        chart.ready().then(() => {
          setTimeout(triggerResize, 100);
          setTimeout(triggerResize, 400);
        });
      }

      // Keep chart responsive to sidebar toggle and container resizes
      resizeObserver = new ResizeObserver(() => {
        triggerResize();
      });
      resizeObserver.observe(chartContainerRef.current);
    } catch (err) {
      console.error('[TerminalPage] Error initializing KLineChartPro:', err);
    }

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      if (resizeObserver) resizeObserver.disconnect();

      // Clean up chart instance and WebSockets on unmount
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.destroy?.();
        } catch (destroyErr) {
          console.warn('[TerminalPage] Chart destroy warning:', destroyErr);
        }
        chartInstanceRef.current = null;
      }
      binanceDatafeed.destroy();
    };
  }, []);

  return (
    <div
      className="w-full flex-1 min-h-0 bg-[#151517] relative overflow-hidden"
      style={{
        width: '100%',
        height: 'calc(100vh - 4rem)',
        maxHeight: 'calc(100vh - 4rem)',
        backgroundColor: '#151517'
      }}
    >
      <div
        ref={chartContainerRef}
        id="klinecharts-pro-container"
        className="w-full"
        style={{
          width: '100%',
          height: 'calc(100vh - 4rem)',
          maxHeight: 'calc(100vh - 4rem)',
          backgroundColor: '#151517'
        }}
      />
    </div>
  );
};
