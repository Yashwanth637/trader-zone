import React, { useState, useEffect, useRef, useCallback } from 'react';
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
}

interface ActiveDragState {
  mode: 'MOVE_TP' | 'MOVE_SL' | 'CREATE_FROM_ENTRY';
  currentPrice: number;
  currentY: number;
  targetType: 'TP' | 'SL';
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
  onModifyPosition
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const overlayRef = useRef<SVGSVGElement>(null);
  const [, setTick] = useState(0);

  // Active drag state for creating or moving SL / TP
  const [activeDrag, setActiveDrag] = useState<ActiveDragState | null>(null);

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
      return parts[1] ? Math.min(parts[1].length, 3) : 2;
    }
    return 2;
  }, [openPosition]);

  // Zero-lag synchronization with chart timeScale and visible range
  useEffect(() => {
    if (!chart) return;
    const handleRangeChange = () => {
      setTick(t => (t + 1) % 1000000);
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    chart.timeScale().subscribeVisibleTimeRangeChange(handleRangeChange);
    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handleRangeChange);
    };
  }, [chart]);

  // Global pointer tracking during active drag
  useEffect(() => {
    if (!activeDrag || !series) return;

    const onPointerMove = (e: PointerEvent) => {
      if (!overlayRef.current || !series || !openPosition) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const rawY = Math.max(10, Math.min(height - 10, e.clientY - rect.top));
      const price = series.coordinateToPrice(rawY);
      if (price === null || isNaN(price)) return;

      const roundedPrice = parseFloat(price.toFixed(priceDecimals));

      // Determine if dragging above or below entry
      const isAboveEntry = roundedPrice > openPosition.entryPrice;
      let targetType: 'TP' | 'SL' = activeDrag.targetType;

      if (activeDrag.mode === 'CREATE_FROM_ENTRY') {
        if (openPosition.side === 'BUY') {
          targetType = isAboveEntry ? 'TP' : 'SL';
        } else {
          targetType = isAboveEntry ? 'SL' : 'TP';
        }
      }

      // Boundary Clamping Rule:
      // - BUY:
      //   * TP cannot go below entry (tp >= entry + minStep)
      //   * SL can go below entry; SL can only go above entry if price has moved above entry (cur > entry), up to cur - minStep
      // - SELL:
      //   * TP cannot go above entry (tp <= entry - minStep)
      //   * SL can go above entry; SL can only go below entry if price has moved below entry (cur < entry), down to cur + minStep
      const entry = openPosition.entryPrice;
      const cur = currentCandle ? currentCandle.close : entry;
      const minStep = Math.pow(10, -priceDecimals);

      let clampedPrice = roundedPrice;

      if (targetType === 'TP') {
        if (openPosition.side === 'BUY') {
          // BUY TP cannot go below entry
          clampedPrice = Math.max(entry + minStep, roundedPrice);
        } else {
          // SELL TP cannot go above entry
          clampedPrice = Math.min(entry - minStep, roundedPrice);
          clampedPrice = Math.max(minStep, clampedPrice);
        }
      } else if (targetType === 'SL') {
        if (openPosition.side === 'BUY') {
          if (cur > entry) {
            // Price moved above entry: can trail SL into profit up to cur - minStep
            const maxSl = cur - minStep;
            clampedPrice = Math.min(maxSl, roundedPrice);
          } else {
            // Price has not moved above entry: SL cannot go above entry
            clampedPrice = Math.min(entry - minStep, roundedPrice);
          }
          clampedPrice = Math.max(minStep, clampedPrice);
        } else {
          if (cur < entry) {
            // Price moved below entry: can trail SL into profit down to cur + minStep
            const minSl = cur + minStep;
            clampedPrice = Math.max(minSl, roundedPrice);
          } else {
            // Price has not moved below entry: SL cannot go below entry
            clampedPrice = Math.max(entry + minStep, roundedPrice);
          }
        }
      }

      clampedPrice = parseFloat(clampedPrice.toFixed(priceDecimals));
      const clampedY = series.priceToCoordinate(clampedPrice) ?? rawY;

      setActiveDrag(prev => prev ? {
        ...prev,
        currentPrice: clampedPrice,
        currentY: clampedY,
        targetType
      } : null);
    };

    const onPointerUp = () => {
      if (!activeDrag) return;
      if (activeDrag.targetType === 'TP') {
        onModifyPosition({ takeProfit: activeDrag.currentPrice });
      } else if (activeDrag.targetType === 'SL') {
        onModifyPosition({ stopLoss: activeDrag.currentPrice });
      }
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [activeDrag, series, height, priceDecimals, openPosition, currentCandle, onModifyPosition]);

  if (!openPosition || !series || width <= 0 || height <= 0) {
    return null;
  }

  const { entryPrice, stopLoss, takeProfit, quantity, side } = openPosition;
  const currentPrice = currentCandle ? currentCandle.close : entryPrice;

  // Calculate live floating P&L (Unrealized)
  const priceDiff = side === 'BUY' ? currentPrice - entryPrice : entryPrice - currentPrice;
  const livePnl = priceDiff * quantity * multiplier;
  const livePnlFormatted = `${livePnl >= 0 ? '+' : ''}${livePnl.toFixed(2)}`;
  const isPnlPositive = livePnl >= 0;

  // Screen Y Coordinates
  const entryY = series.priceToCoordinate(entryPrice);
  const slY = stopLoss !== undefined ? series.priceToCoordinate(stopLoss) : null;
  const tpY = takeProfit !== undefined ? series.priceToCoordinate(takeProfit) : null;

  // Stop Loss & Take Profit Projected Amounts
  const slIsProfit = side === 'BUY'
    ? (stopLoss !== undefined && stopLoss > entryPrice)
    : (stopLoss !== undefined && stopLoss < entryPrice);
  const slIsBe = stopLoss !== undefined && stopLoss === entryPrice;

  const slDiff = stopLoss !== undefined ? Math.abs(entryPrice - stopLoss) : 0;
  const slAmount = slDiff * quantity * multiplier;
  const slLossFormatted = slIsBe
    ? '0.00 USD (BE)'
    : slIsProfit
    ? `+ ${slAmount.toFixed(2)} USD`
    : `- ${slAmount.toFixed(2)} USD`;

  const tpProfitAmount = takeProfit !== undefined
    ? Math.abs(takeProfit - entryPrice) * quantity * multiplier
    : 0;
  const tpProfitFormatted = `+ ${tpProfitAmount.toFixed(2)} USD`;

  const priceAxisWidth = 65;
  const lineEndX = width - priceAxisWidth;

  // Helper for real-time drag PnL readout
  const getDragPnlFormatted = (dragPrice: number, isTp: boolean) => {
    const diff = Math.abs(dragPrice - entryPrice);
    const amount = (diff * quantity * multiplier).toFixed(2);
    if (isTp) return `+ ${amount} USD`;
    const isProfit = side === 'BUY' ? dragPrice > entryPrice : dragPrice < entryPrice;
    const isBe = dragPrice === entryPrice;
    if (isBe) return `0.00 USD (BE)`;
    return isProfit ? `+ ${amount} USD` : `- ${amount} USD`;
  };

  return (
    <svg
      ref={overlayRef}
      className="tradingview-position-overlay absolute inset-0 pointer-events-none z-20 select-none overflow-visible"
      style={{ width, height }}
    >
      {/* =========================================================================
          1. STOP LOSS (SL) LINE & PILL (Exact Image 1 Style: Coral/Red Line & Tag)
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
              setActiveDrag({
                mode: 'MOVE_SL',
                currentPrice: stopLoss,
                currentY: slY,
                targetType: 'SL'
              });
            }}
          />

          {/* Solid Red Horizontal Line (Exact Image 1) */}
          <line
            x1={0}
            y1={slY}
            x2={lineEndX}
            y2={slY}
            stroke="#f23645"
            strokeWidth={1.5}
            className="pointer-events-none"
          />

          {/* SL 3-Segment Interactive Pill: [ 0.04 (Red) | - 27.79 USD | ✕ ] */}
          <g
            transform={`translate(${lineEndX - 180}, ${slY - 12})`}
            className="pointer-events-auto cursor-ns-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setActiveDrag({
                mode: 'MOVE_SL',
                currentPrice: stopLoss,
                currentY: slY,
                targetType: 'SL'
              });
            }}
          >
            {/* Pill Outer Container */}
            <rect
              x={0}
              y={0}
              width={170}
              height={24}
              rx={5}
              fill="#0b111e"
              stroke="#f23645"
              strokeWidth={1}
              className="drop-shadow-md"
            />

            {/* Segment 1: Lot Size Badge (Solid Red) */}
            <rect
              x={0}
              y={0}
              width={40}
              height={24}
              rx={5}
              fill="#f23645"
            />
            {/* Right edge square fix for segment 1 */}
            <rect
              x={35}
              y={0}
              width={5}
              height={24}
              fill="#f23645"
            />
            <text
              x={20}
              y={16}
              fill="#ffffff"
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {quantity}
            </text>

            {/* Segment 2: Projected Loss or Locked Profit Amount */}
            <text
              x={95}
              y={16}
              fill={slIsProfit ? '#34d399' : slIsBe ? '#60a5fa' : '#f87171'}
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {slLossFormatted}
            </text>

            {/* Segment 3: Cancel SL Button (✕) */}
            <g
              transform="translate(155, 12)"
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onModifyPosition({ stopLoss: undefined });
              }}
            >
              <circle cx={0} cy={0} r={8} fill="transparent" className="hover:fill-red-500/25 transition-colors" />
              <path
                d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5"
                stroke="#f23645"
                strokeWidth={1.8}
                strokeLinecap="round"
                className="group-hover:stroke-white transition-colors"
              />
            </g>
          </g>

          {/* SL Price Scale Tag on Right Axis (Solid Red Rect, Exact Image 1) */}
          <g transform={`translate(${lineEndX}, ${slY - 11})`} className="pointer-events-none">
            <rect
              x={0}
              y={0}
              width={priceAxisWidth}
              height={22}
              fill="#f23645"
              className="drop-shadow-sm"
            />
            <text
              x={priceAxisWidth / 2}
              y={15}
              fill="#ffffff"
              fontSize={11}
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
          2. TAKE PROFIT (TP) LINE & PILL (Exact Image 1 Style: Teal Line & Tag)
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
              setActiveDrag({
                mode: 'MOVE_TP',
                currentPrice: takeProfit,
                currentY: tpY,
                targetType: 'TP'
              });
            }}
          />

          {/* Solid Teal Horizontal Line (Exact Image 1) */}
          <line
            x1={0}
            y1={tpY}
            x2={lineEndX}
            y2={tpY}
            stroke="#089981"
            strokeWidth={1.5}
            className="pointer-events-none"
          />

          {/* TP 3-Segment Interactive Pill: [ 0.04 (Teal) | + 67.05 USD | ✕ ] */}
          <g
            transform={`translate(${lineEndX - 180}, ${tpY - 12})`}
            className="pointer-events-auto cursor-ns-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setActiveDrag({
                mode: 'MOVE_TP',
                currentPrice: takeProfit,
                currentY: tpY,
                targetType: 'TP'
              });
            }}
          >
            {/* Pill Outer Container */}
            <rect
              x={0}
              y={0}
              width={170}
              height={24}
              rx={5}
              fill="#0b111e"
              stroke="#089981"
              strokeWidth={1}
              className="drop-shadow-md"
            />

            {/* Segment 1: Lot Size Badge (Solid Teal) */}
            <rect
              x={0}
              y={0}
              width={40}
              height={24}
              rx={5}
              fill="#089981"
            />
            {/* Right edge square fix for segment 1 */}
            <rect
              x={35}
              y={0}
              width={5}
              height={24}
              fill="#089981"
            />
            <text
              x={20}
              y={16}
              fill="#ffffff"
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {quantity}
            </text>

            {/* Segment 2: Projected Profit Amount (+ 67.05 USD) */}
            <text
              x={95}
              y={16}
              fill="#34d399"
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {tpProfitFormatted}
            </text>

            {/* Segment 3: Cancel TP Button (✕) */}
            <g
              transform="translate(155, 12)"
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onModifyPosition({ takeProfit: undefined });
              }}
            >
              <circle cx={0} cy={0} r={8} fill="transparent" className="hover:fill-emerald-500/25 transition-colors" />
              <path
                d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5"
                stroke="#089981"
                strokeWidth={1.8}
                strokeLinecap="round"
                className="group-hover:stroke-white transition-colors"
              />
            </g>
          </g>

          {/* TP Price Scale Tag on Right Axis (Solid Teal Rect, Exact Image 1) */}
          <g transform={`translate(${lineEndX}, ${tpY - 11})`} className="pointer-events-none">
            <rect
              x={0}
              y={0}
              width={priceAxisWidth}
              height={22}
              fill="#089981"
              className="drop-shadow-sm"
            />
            <text
              x={priceAxisWidth / 2}
              y={15}
              fill="#ffffff"
              fontSize={11}
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
          3. BLUE ENTRY LINE & PILL (Exact Image 1 Style: Solid Blue Line & Tag)
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

          {/* Interactive Drag Handle to pull TP / SL directly from Entry Line (Requirement #2) */}
          <line
            x1={0}
            y1={entryY}
            x2={lineEndX - 165}
            y2={entryY}
            stroke="transparent"
            strokeWidth={24}
            className="pointer-events-auto cursor-ns-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const rect = overlayRef.current?.getBoundingClientRect();
              const y = rect ? e.clientY - rect.top : entryY;
              setActiveDrag({
                mode: 'CREATE_FROM_ENTRY',
                currentPrice: entryPrice,
                currentY: y,
                targetType: 'TP'
              });
            }}
          >
            <title>Click and drag UP or DOWN to set Take Profit or Stop Loss</title>
          </line>

          {/* Entry 3-Segment Pill: [ 0.04 (Solid Blue) | Live PnL | ✕ (Close) ] */}
          <g
            transform={`translate(${lineEndX - 150}, ${entryY - 12})`}
            className="pointer-events-auto"
          >
            {/* Pill Container */}
            <rect
              x={0}
              y={0}
              width={140}
              height={24}
              rx={5}
              fill="#0b111e"
              stroke="#2563eb"
              strokeWidth={1}
              className="drop-shadow-md cursor-ns-resize"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setActiveDrag({
                  mode: 'CREATE_FROM_ENTRY',
                  currentPrice: entryPrice,
                  currentY: entryY,
                  targetType: 'TP'
                });
              }}
            />

            {/* Segment 1: Lot Size Badge (Solid Blue, Exact Image 1) */}
            <rect
              x={0}
              y={0}
              width={40}
              height={24}
              rx={5}
              fill="#2563eb"
              className="cursor-ns-resize"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setActiveDrag({
                  mode: 'CREATE_FROM_ENTRY',
                  currentPrice: entryPrice,
                  currentY: entryY,
                  targetType: 'TP'
                });
              }}
            />
            <rect
              x={35}
              y={0}
              width={5}
              height={24}
              fill="#2563eb"
            />
            <text
              x={20}
              y={16}
              fill="#ffffff"
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
              className="cursor-ns-resize"
            >
              {quantity}
            </text>

            {/* Segment 2: Live Floating P&L (-6.36) */}
            <text
              x={80}
              y={16}
              fill={isPnlPositive ? '#34d399' : '#f87171'}
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
              className="cursor-ns-resize"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setActiveDrag({
                  mode: 'CREATE_FROM_ENTRY',
                  currentPrice: entryPrice,
                  currentY: entryY,
                  targetType: 'TP'
                });
              }}
            >
              {livePnlFormatted}
            </text>

            {/* Segment 3: Instant Close Button (✕, Exact Image 1) */}
            <g
              transform="translate(126, 12)"
              className="cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                onClosePosition();
              }}
            >
              <title>Close Position at Market Price</title>
              <circle cx={0} cy={0} r={8} fill="transparent" className="hover:fill-blue-500/25 transition-colors" />
              <path
                d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5"
                stroke="#60a5fa"
                strokeWidth={1.8}
                strokeLinecap="round"
                className="group-hover:stroke-white transition-colors"
              />
            </g>
          </g>

          {/* Entry Price Scale Tag on Right Axis (Solid Blue Rect, Exact Image 1) */}
          <g transform={`translate(${lineEndX}, ${entryY - 11})`} className="pointer-events-none">
            <rect
              x={0}
              y={0}
              width={priceAxisWidth}
              height={22}
              fill="#2563eb"
              className="drop-shadow-sm"
            />
            <text
              x={priceAxisWidth / 2}
              y={15}
              fill="#ffffff"
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {entryPrice.toFixed(priceDecimals)}
            </text>
          </g>
        </g>
      )}

      {/* =========================================================================
          4. DYNAMIC CLICK & DRAG PREVIEW (Live PnL Readout while Dragging, Requirement #2)
         ========================================================================= */}
      {activeDrag !== null && (
        <g className="active-drag-preview pointer-events-none">
          {/* Dynamic Drag Horizontal Line */}
          <line
            x1={0}
            y1={activeDrag.currentY}
            x2={lineEndX}
            y2={activeDrag.currentY}
            stroke={activeDrag.targetType === 'TP' ? '#089981' : '#f23645'}
            strokeWidth={1.75}
            strokeDasharray="4 2"
          />

          {/* Dynamic Drag Pill with Real-Time PnL Readout */}
          <g transform={`translate(${lineEndX - 180}, ${activeDrag.currentY - 12})`}>
            <rect
              x={0}
              y={0}
              width={170}
              height={24}
              rx={5}
              fill="#0b111e"
              stroke={activeDrag.targetType === 'TP' ? '#089981' : '#f23645'}
              strokeWidth={1.5}
              className="drop-shadow-xl"
            />
            {/* Color Badge */}
            <rect
              x={0}
              y={0}
              width={40}
              height={24}
              rx={5}
              fill={activeDrag.targetType === 'TP' ? '#089981' : '#f23645'}
            />
            <rect
              x={35}
              y={0}
              width={5}
              height={24}
              fill={activeDrag.targetType === 'TP' ? '#089981' : '#f23645'}
            />
            <text
              x={20}
              y={16}
              fill="#ffffff"
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {quantity}
            </text>

            {/* Real-time Dynamic PnL Reading */}
            <text
              x={95}
              y={16}
              fill={
                activeDrag.targetType === 'TP' ||
                (side === 'BUY' ? activeDrag.currentPrice > entryPrice : activeDrag.currentPrice < entryPrice)
                  ? '#34d399'
                  : activeDrag.currentPrice === entryPrice
                  ? '#60a5fa'
                  : '#f87171'
              }
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {getDragPnlFormatted(activeDrag.currentPrice, activeDrag.targetType === 'TP')}
            </text>

            {/* Mode Indicator Tag */}
            <text
              x={152}
              y={15}
              fill={activeDrag.targetType === 'TP' ? '#089981' : '#f23645'}
              fontSize={9}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {activeDrag.targetType}
            </text>
          </g>

          {/* Dynamic Price Scale Tag on Right Axis */}
          <g transform={`translate(${lineEndX}, ${activeDrag.currentY - 11})`}>
            <rect
              x={0}
              y={0}
              width={priceAxisWidth}
              height={22}
              fill={activeDrag.targetType === 'TP' ? '#089981' : '#f23645'}
              className="drop-shadow-lg"
            />
            <text
              x={priceAxisWidth / 2}
              y={15}
              fill="#ffffff"
              fontSize={11}
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {activeDrag.currentPrice.toFixed(priceDecimals)}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
};
