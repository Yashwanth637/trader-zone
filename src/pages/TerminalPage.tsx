import React, { useEffect, useRef } from 'react';
import { KLineChartPro, SymbolInfo, Period } from '@simahfud/klinecharts-pro';
import { LineType } from 'klinecharts';
import '@simahfud/klinecharts-pro/dist/klinecharts-pro.css';
import { binanceDatafeed } from '../lib/binanceDatafeed';

export const TerminalPage: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<KLineChartPro | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Default symbol according to requirements: BTCUSDT on Binance
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

    // Default timeframe according to requirements: 1H
    const defaultPeriod: Period = {
      multiplier: 1,
      timespan: 'hour',
      text: '1H'
    };

    // Built-in timeframe switcher: 1m, 5m, 15m, 1h, 4h, 1D, 1W
    const periods: Period[] = [
      { multiplier: 1, timespan: 'minute', text: '1m' },
      { multiplier: 5, timespan: 'minute', text: '5m' },
      { multiplier: 15, timespan: 'minute', text: '15m' },
      { multiplier: 1, timespan: 'hour', text: '1h' },
      { multiplier: 4, timespan: 'hour', text: '4h' },
      { multiplier: 1, timespan: 'day', text: '1D' },
      { multiplier: 1, timespan: 'week', text: '1W' }
    ];

    try {
      // Initialize institutional TradingView-style KLineChartPro
      const chart = new KLineChartPro({
        container: chartContainerRef.current,
        theme: 'dark',
        symbol: defaultSymbol,
        period: defaultPeriod,
        periods,
        datafeed: binanceDatafeed,
        mainIndicators: ['EMA'],
        subIndicators: ['VOL'],
        drawingBarVisible: true,
        styles: {
          grid: {
            horizontal: {
              style: LineType.Dashed,
              color: 'rgba(255, 255, 255, 0.08)'
            },
            vertical: {
              style: LineType.Dashed,
              color: 'rgba(255, 255, 255, 0.08)'
            }
          },
          candle: {
            priceMark: {
              last: {
                show: true,
                line: {
                  show: true,
                  style: LineType.Dashed
                },
                text: {
                  show: true
                }
              }
            }
          }
        }
      });

      chartInstanceRef.current = chart;

      // Safely ensure EMA and VOL indicators are created if supported by widget API
      try {
        const widget = chart.getWidget?.();
        if (widget && typeof widget.createIndicator === 'function') {
          widget.createIndicator('EMA', false, { id: 'candle_pane' });
          widget.createIndicator('VOL', true);
        }
      } catch (widgetErr) {
        // Options mainIndicators and subIndicators handle it natively
      }
    } catch (err) {
      console.error('[TerminalPage] Error initializing KLineChartPro:', err);
    }

    return () => {
      // Clean up chart and underlying WebSockets on unmount
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
      className="w-full h-full bg-[#151517] relative overflow-hidden"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        backgroundColor: '#151517'
      }}
    >
      <div
        ref={chartContainerRef}
        id="klinecharts-pro-container"
        className="w-full h-full"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#151517'
        }}
      />
    </div>
  );
};
