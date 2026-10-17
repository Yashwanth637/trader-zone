import React, { useState, useEffect, useRef } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { BacktestPosition, BacktestCandle } from '../../types/backtest';
import { SUPPORTED_ASSETS } from '../../lib/backtestDataService';
import { useTheme } from '../../context/ThemeContext';

interface BacktestPositionOverlayProps {
  openPosition: BacktestPosition | null;
  currentCandle: BacktestCandle | null;
  series: ISeriesApi<'Candlestick'> | null;
  chart: IChartApi | null;
  width: number;
  height: number;
  symbol: string;
  onClosePosition: () => void;
  onModifyPosition: (params: { stopLoss?: number; takeProfit?: number }) => void;
  onQuickAddTp?: () => void;
  onQuickAddSl?: () => void;
}

export const BacktestPositionOverlay: React.FC<BacktestPositionOverlayProps> = ({
  openPosition,
  currentCandle,
  series,
  chart,
  width,
  height,
  symbol,
  onClosePosition,
  onModifyPosition,
  onQuickAddTp,
  onQuickAddSl
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Drag state for SL and TP lines
  const [activeDrag, setActiveDrag] = useState<{
    type: 'SL' | 'TP';
    startPrice: number;
  } | null>(null);

  // Asset multiplier (e.g. 100 for Gold XAUUSD, 100,000 for FX EURUSD, 1 for Crypto)
  const multiplier = React.useMemo(() => {
    const asset = SUPPORTED_ASSETS.find(a => a.id === symbol);
    if (asset?.lotMultiplier) return asset.lotMultiplier;
    if (symbol.includes('XAU') || symbol.includes('GOLD')) return 100;
    if (symbol.includes('BTC') || symbol.includes('ETH')) return 1;
    return 100000;
  }, [symbol]);

  // Determine decimal places for price formatting
  const priceDecimals = React.useMemo(() => {
    if (openPosition) {
      const parts = openPosition.entryPrice.toString().split('.');
      return parts[1] ? parts[1].length : 2;
    }
    return 2;
  }, [openPosition]);

  // Global mouse pointer movement for smooth dragging
  useEffect(() => {
    if (!activeDrag || !series) return;

    const onPointerMove = (e: PointerEvent) => {
      const chartContainer = document.querySelector('.tradingview-position-overlay');
      if (!chartContainer || !series) return;
      const rect = chartContainer.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const price = series.coordinateToPrice(y);
      if (price === null || isNaN(price)) return;

      const rounded = parseFloat(price.toFixed(priceDecimals));

      if (activeDrag.type === 'SL') {
        onModifyPosition({ stopLoss: rounded });
      } else if (activeDrag.type === 'TP') {
        onModifyPosition({ takeProfit: rounded });
      }
    };

    const onPointerUp = () => {
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [activeDrag, series, priceDecimals, onModifyPosition]);

  if (!openPosition || !series || width <= 0 || height <= 0) {
    return null;
  }

  const { entryPrice, stopLoss, takeProfit, quantity, side } = openPosition;
  const currentPrice = currentCandle ? currentCandle.close : entryPrice;

  // Live Unrealized P&L
  const priceDiff = side === 'BUY' ? currentPrice - entryPrice : entryPrice - currentPrice;
  const livePnl = priceDiff * quantity * multiplier;
  const livePnlFormatted = `${livePnl >= 0 ? '+' : '-'}$${Math.abs(livePnl).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
  const isPnlPositive = livePnl >= 0;

  // Screen Y Coordinates
  const entryY = series.priceToCoordinate(entryPrice);
  const slY = stopLoss !== undefined ? series.priceToCoordinate(stopLoss) : null;
  const tpY = takeProfit !== undefined ? series.priceToCoordinate(takeProfit) : null;

  // Stop Loss & Take Profit Projected Amounts
  const slLossAmount = stopLoss !== undefined
    ? Math.abs(entryPrice - stopLoss) * quantity * multiplier
    : 0;
  const slLossFormatted = `-${slLossAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} USD`;

  const tpProfitAmount = takeProfit !== undefined
    ? Math.abs(takeProfit - entryPrice) * quantity * multiplier
    : 0;
  const tpProfitFormatted = `+${tpProfitAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} USD`;

  const priceAxisWidth = 65;
  const lineEndX = width - priceAxisWidth;

  return (
    <svg
      className="tradingview-position-overlay absolute inset-0 pointer-events-none z-20 select-none overflow-visible"
      style={{ width, height }}
    >
      {/* =========================================================================
          1. STOP LOSS (SL) LINE & TAG (Dashed Amber/Orange, FX Replay Style)
         ========================================================================= */}
      {slY !== null && stopLoss !== undefined && (
        <g className="sl-group">
          {/* Invisible wide grab zone */}
          <line
            x1={0}
            y1={slY}
            x2={lineEndX}
            y2={slY}
            stroke="transparent"
            strokeWidth={26}
            className="pointer-events-auto cursor-ns-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setActiveDrag({ type: 'SL', startPrice: stopLoss });
            }}
          />

          {/* Dashed Amber Line */}
          <line
            x1={0}
            y1={slY}
            x2={lineEndX}
            y2={slY}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            className="pointer-events-none"
          />

          {/* SL 3-Segment Interactive Pill: [ Quantity | -Amount USD | X ] */}
          <g
            transform={`translate(${lineEndX - 195}, ${slY - 12})`}
            className="pointer-events-auto cursor-ns-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setActiveDrag({ type: 'SL', startPrice: stopLoss });
            }}
          >
            {/* Pill Container */}
            <rect
              x={0}
              y={0}
              width={185}
              height={24}
              rx={6}
              fill={isDark ? '#14110a' : '#fffbeb'}
              stroke="#f59e0b"
              strokeWidth={1.2}
              strokeDasharray="4 2"
              className="drop-shadow-sm hover:stroke-width-[1.8] transition-all"
            />

            {/* Segment 1: Lot Size */}
            <text
              x={14}
              y={16}
              fill="#f59e0b"
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {quantity}
            </text>

            {/* Divider 1 */}
            <line x1={27} y1={4} x2={27} y2={20} stroke="#f59e0b" strokeOpacity={0.4} strokeWidth={1} />

            {/* Segment 2: Projected Loss Amount */}
            <text
              x={100}
              y={16}
              fill="#f59e0b"
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {slLossFormatted}
            </text>

            {/* Divider 2 */}
            <line x1={160} y1={4} x2={160} y2={20} stroke="#f59e0b" strokeOpacity={0.4} strokeWidth={1} />

            {/* Segment 3: Cancel SL Button (X) */}
            <g
              transform="translate(172, 12)"
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onModifyPosition({ stopLoss: undefined });
              }}
            >
              <circle cx={0} cy={0} r={7} fill="transparent" className="hover:fill-amber-500/20" />
              <path
                d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5"
                stroke="#f59e0b"
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </g>
          </g>

          {/* SL Price Scale Badge on Right Axis */}
          <g transform={`translate(${lineEndX}, ${slY - 10})`} className="pointer-events-none">
            <rect
              x={0}
              y={0}
              width={priceAxisWidth}
              height={20}
              fill="#d97706"
              className="drop-shadow-sm"
            />
            <text
              x={priceAxisWidth / 2}
              y={14}
              fill="#ffffff"
              fontSize={10.5}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {stopLoss.toFixed(priceDecimals)}
            </text>
          </g>
        </g>
      )}

      {/* =========================================================================
          2. TAKE PROFIT (TP) LINE & TAG (Dashed Green/Emerald, FX Replay Style)
         ========================================================================= */}
      {tpY !== null && takeProfit !== undefined && (
        <g className="tp-group">
          {/* Invisible wide grab zone */}
          <line
            x1={0}
            y1={tpY}
            x2={lineEndX}
            y2={tpY}
            stroke="transparent"
            strokeWidth={26}
            className="pointer-events-auto cursor-ns-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setActiveDrag({ type: 'TP', startPrice: takeProfit });
            }}
          />

          {/* Dashed Green Line */}
          <line
            x1={0}
            y1={tpY}
            x2={lineEndX}
            y2={tpY}
            stroke="#10b981"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            className="pointer-events-none"
          />

          {/* TP 3-Segment Interactive Pill: [ Quantity | +Amount USD | X ] */}
          <g
            transform={`translate(${lineEndX - 195}, ${tpY - 12})`}
            className="pointer-events-auto cursor-ns-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setActiveDrag({ type: 'TP', startPrice: takeProfit });
            }}
          >
            {/* Pill Container */}
            <rect
              x={0}
              y={0}
              width={185}
              height={24}
              rx={6}
              fill={isDark ? '#091510' : '#f0fdf4'}
              stroke="#10b981"
              strokeWidth={1.2}
              strokeDasharray="4 2"
              className="drop-shadow-sm hover:stroke-width-[1.8] transition-all"
            />

            {/* Segment 1: Lot Size */}
            <text
              x={14}
              y={16}
              fill="#10b981"
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {quantity}
            </text>

            {/* Divider 1 */}
            <line x1={27} y1={4} x2={27} y2={20} stroke="#10b981" strokeOpacity={0.4} strokeWidth={1} />

            {/* Segment 2: Projected Profit Amount */}
            <text
              x={100}
              y={16}
              fill="#10b981"
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {tpProfitFormatted}
            </text>

            {/* Divider 2 */}
            <line x1={160} y1={4} x2={160} y2={20} stroke="#10b981" strokeOpacity={0.4} strokeWidth={1} />

            {/* Segment 3: Cancel TP Button (X) */}
            <g
              transform="translate(172, 12)"
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onModifyPosition({ takeProfit: undefined });
              }}
            >
              <circle cx={0} cy={0} r={7} fill="transparent" className="hover:fill-emerald-500/20" />
              <path
                d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5"
                stroke="#10b981"
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            </g>
          </g>

          {/* TP Price Scale Badge on Right Axis */}
          <g transform={`translate(${lineEndX}, ${tpY - 10})`} className="pointer-events-none">
            <rect
              x={0}
              y={0}
              width={priceAxisWidth}
              height={20}
              fill="#059669"
              className="drop-shadow-sm"
            />
            <text
              x={priceAxisWidth / 2}
              y={14}
              fill="#ffffff"
              fontSize={10.5}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {takeProfit.toFixed(priceDecimals)}
            </text>
          </g>
        </g>
      )}

      {/* =========================================================================
          3. SOLID BLUE ENTRY LINE & 3-SEGMENT P&L PILL (Exact FX Replay Style)
         ========================================================================= */}
      {entryY !== null && (
        <g className="entry-group">
          {/* Solid Blue Horizontal Entry Line */}
          <line
            x1={0}
            y1={entryY}
            x2={lineEndX}
            y2={entryY}
            stroke="#2563eb"
            strokeWidth={1.5}
            className="pointer-events-none"
          />

          {/* Quick Add +TP Pill if Take Profit is not set */}
          {takeProfit === undefined && (
            <g
              transform={`translate(${lineEndX - 210}, ${entryY - 10})`}
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const defaultOffset = (entryPrice * 0.006); // 0.6% target
                const newTp = side === 'BUY' ? entryPrice + defaultOffset : entryPrice - defaultOffset;
                onModifyPosition({ takeProfit: parseFloat(newTp.toFixed(priceDecimals)) });
              }}
            >
              <rect
                x={0}
                y={0}
                width={40}
                height={20}
                rx={5}
                fill={isDark ? '#0f172a' : '#f8fafc'}
                stroke="#2563eb"
                strokeWidth={1}
                strokeOpacity={0.8}
                className="hover:fill-blue-500/20 transition-colors"
              />
              <text
                x={20}
                y={14}
                fill="#3b82f6"
                fontSize={10}
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
                textAnchor="middle"
              >
                +TP
              </text>
            </g>
          )}

          {/* Quick Add +SL Pill if Stop Loss is not set */}
          {stopLoss === undefined && (
            <g
              transform={`translate(${lineEndX - (takeProfit === undefined ? 260 : 210)}, ${entryY - 10})`}
              className="pointer-events-auto cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const defaultOffset = (entryPrice * 0.003); // 0.3% risk
                const newSl = side === 'BUY' ? entryPrice - defaultOffset : entryPrice + defaultOffset;
                onModifyPosition({ stopLoss: parseFloat(newSl.toFixed(priceDecimals)) });
              }}
            >
              <rect
                x={0}
                y={0}
                width={40}
                height={20}
                rx={5}
                fill={isDark ? '#0f172a' : '#f8fafc'}
                stroke="#f59e0b"
                strokeWidth={1}
                strokeOpacity={0.8}
                className="hover:fill-amber-500/20 transition-colors"
              />
              <text
                x={20}
                y={14}
                fill="#f59e0b"
                fontSize={10}
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
                textAnchor="middle"
              >
                +SL
              </text>
            </g>
          )}

          {/* Entry 3-Segment Pill: [ Quantity | Floating P&L | Close X ] */}
          <g transform={`translate(${lineEndX - 150}, ${entryY - 12})`} className="pointer-events-auto">
            {/* Pill Container */}
            <rect
              x={0}
              y={0}
              width={140}
              height={24}
              rx={6}
              fill={isDark ? '#0a0f1d' : '#eff6ff'}
              stroke="#2563eb"
              strokeWidth={1.5}
              className="drop-shadow-md"
            />

            {/* Segment 1: Lot Size */}
            <text
              x={14}
              y={16}
              fill="#2563eb"
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {quantity}
            </text>

            {/* Divider 1 */}
            <line x1={26} y1={4} x2={26} y2={20} stroke="#2563eb" strokeOpacity={0.4} strokeWidth={1} />

            {/* Segment 2: Dynamic Live Floating P&L */}
            <text
              x={78}
              y={16}
              fill={isPnlPositive ? '#2563eb' : '#f43f5e'}
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {livePnlFormatted}
            </text>

            {/* Divider 2 */}
            <line x1={118} y1={4} x2={118} y2={20} stroke="#2563eb" strokeOpacity={0.4} strokeWidth={1} />

            {/* Segment 3: Instant Close Button (X) */}
            <g
              transform="translate(129, 12)"
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onClosePosition();
              }}
            >
              <title>Close Position at Market Price</title>
              <circle cx={0} cy={0} r={8} fill="transparent" className="hover:fill-red-500/20" />
              <path
                d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5"
                stroke={isDark ? '#93c5fd' : '#2563eb'}
                strokeWidth={1.75}
                strokeLinecap="round"
                className="group-hover:stroke-red-500 transition-colors"
              />
            </g>
          </g>

          {/* Blue Circular Dot Connection */}
          <circle
            cx={lineEndX}
            cy={entryY}
            r={3.5}
            fill="#2563eb"
            className="pointer-events-none"
          />

          {/* Entry Price Scale Badge on Right Axis */}
          <g transform={`translate(${lineEndX}, ${entryY - 10})`} className="pointer-events-none">
            <rect
              x={0}
              y={0}
              width={priceAxisWidth}
              height={20}
              fill="#2563eb"
              className="drop-shadow-sm"
            />
            <text
              x={priceAxisWidth / 2}
              y={14}
              fill="#ffffff"
              fontSize={10.5}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {entryPrice.toFixed(priceDecimals)}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
};
