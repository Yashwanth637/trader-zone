import React, { useEffect, useState } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { IndicatorBoxOutput } from '../../lib/pineScriptEngine';

interface IndicatorZonesOverlayProps {
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  boxes: IndicatorBoxOutput[];
  width: number;
  height: number;
}

export const IndicatorZonesOverlay: React.FC<IndicatorZonesOverlayProps> = ({
  chart,
  series,
  boxes,
  width,
  height
}) => {
  const [, setTick] = useState(0);

  // Subscribe to chart viewport changes (pan, zoom) to re-project box coordinates
  useEffect(() => {
    if (!chart) return;
    const update = () => setTick(t => t + 1);

    chart.timeScale().subscribeVisibleLogicalRangeChange(update);
    chart.timeScale().subscribeVisibleTimeRangeChange(update);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(update);
      chart.timeScale().unsubscribeVisibleTimeRangeChange(update);
    };
  }, [chart]);

  if (!chart || !series || !boxes || boxes.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
      style={{ width, height }}
    >
      <defs>
        {/* Subtle drop shadow for institutional corridors */}
        <filter id="zoneGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.25" />
        </filter>
      </defs>

      {boxes.map(box => {
        const x1Coord = chart.timeScale().timeToCoordinate(box.leftTime as any);
        const x2Coord = chart.timeScale().timeToCoordinate(box.rightTime as any);
        const yTopCoord = series.priceToCoordinate(box.top);
        const yBottomCoord = series.priceToCoordinate(box.bottom);

        // Skip if price coordinates cannot be calculated
        if (yTopCoord === null || yBottomCoord === null) return null;

        const yTop = yTopCoord as unknown as number;
        const yBottom = yBottomCoord as unknown as number;

        // If left coordinate is scrolled off screen to the left
        const leftX: number = x1Coord !== null ? (x1Coord as unknown as number) : -50;
        
        // If right coordinate is into future space or offscreen to the right
        const rightX: number = x2Coord !== null ? (x2Coord as unknown as number) : (width + 100);

        // Clip if completely out of horizontal bounds
        if (rightX < 0 || leftX > width) return null;

        const boxW = Math.max(rightX - leftX, 8);
        const boxH = Math.max(Math.abs(yBottom - yTop), 2);
        const boxY = Math.min(yTop, yBottom);

        return (
          <g key={box.id} filter="url(#zoneGlow)">
            {/* Shaded Corridor Box */}
            <rect
              x={leftX}
              y={boxY}
              width={boxW}
              height={boxH}
              fill={box.color}
              stroke={box.borderColor}
              strokeWidth={box.isBreached ? 1 : 1.5}
              strokeDasharray={box.isBreached ? '4 3' : undefined}
              rx={2}
            />

            {/* Micro Badge for Active Zones */}
            {boxW >= 55 && (
              <g>
                <rect
                  x={leftX + 4}
                  y={boxY + 2}
                  width={box.isResistance ? 70 : 62}
                  height={13}
                  rx={2}
                  fill={box.isResistance ? 'rgba(0, 188, 212, 0.25)' : 'rgba(255, 235, 59, 0.25)'}
                />
                <text
                  x={leftX + 7}
                  y={boxY + 11.5}
                  fill={box.borderColor}
                  fontSize={8}
                  fontFamily="'Inter', -apple-system, sans-serif"
                  fontWeight="bold"
                  letterSpacing="0.5px"
                >
                  {box.label || (box.isResistance ? 'RES CEILING' : 'SUP FLOOR')}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
};
