import React from 'react';

export interface RadarDimension {
  key: string;
  name: string;
  value: number; // 0 - 100
}

interface RadarChartProps {
  dimensions: RadarDimension[];
  size?: number;
  className?: string;
  fillColor?: string;
  strokeColor?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  dimensions,
  size = 320,
  className = '',
  fillColor = 'rgba(139, 92, 246, 0.45)',
  strokeColor = '#8b5cf6'
}) => {
  // Ensure we have 6 dimensions in correct layout order
  const dims = dimensions.slice(0, 6);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.34; // Radius of polygon web leaving room for labels

  // 6 Angles starting at top (-90 deg / -PI/2) and moving clockwise
  const angles = dims.map((_, i) => (-Math.PI / 2) + (i * (2 * Math.PI / 6)));

  // Compute coordinate given radius factor and angle
  const getPoint = (factor: number, angle: number) => {
    const r = radius * factor;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  };

  // Concentric levels (0.2, 0.4, 0.6, 0.8, 1.0)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Concentric polygon paths
  const gridPolygons = levels.map(level => {
    return angles.map(angle => {
      const pt = getPoint(level, angle);
      return `${pt.x},${pt.y}`;
    }).join(' ');
  });

  // Spokes from center to level 1.0
  const spokes = angles.map(angle => {
    const pt = getPoint(1.0, angle);
    return { x1: cx, y1: cy, x2: pt.x, y2: pt.y };
  });

  // Data polygon points
  const dataPoints = dims.map((d, i) => {
    // Keep a minimum radius of 0.12 so the polygon never collapses completely
    const normalized = Math.max(0.12, Math.min(1.0, (d.value || 0) / 100));
    return getPoint(normalized, angles[i]);
  });

  const dataPolygonString = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Label offsets
  const getLabelAnchor = (i: number) => {
    if (i === 0 || i === 3) return 'middle';
    if (i === 1 || i === 2) return 'start';
    return 'end';
  };

  const getLabelPosition = (i: number) => {
    const angle = angles[i];
    const r = radius + 22; // Offset outside outer ring
    let x = cx + r * Math.cos(angle);
    let y = cy + r * Math.sin(angle);

    // Minor visual adjustment for vertical alignment
    if (i === 0) y -= 4;
    if (i === 3) y += 12;
    if (i === 1 || i === 5) y -= 2;
    if (i === 2 || i === 4) y += 5;

    return { x, y };
  };

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[340px] h-auto overflow-visible"
      >
        <defs>
          {/* Radial gradient for glowing data area */}
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.25" />
          </radialGradient>

          {/* Node shadow / filter */}
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#8b5cf6" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* Concentric Web Polygons */}
        {gridPolygons.map((pts, idx) => (
          <polygon
            key={idx}
            points={pts}
            fill="none"
            stroke="currentColor"
            strokeOpacity={idx === levels.length - 1 ? 0.18 : 0.08}
            strokeWidth={idx === levels.length - 1 ? 1.2 : 0.9}
            className="text-foreground"
          />
        ))}

        {/* Spokes */}
        {spokes.map((spoke, idx) => (
          <line
            key={idx}
            x1={spoke.x1}
            y1={spoke.y1}
            x2={spoke.x2}
            y2={spoke.y2}
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeWidth="1"
            className="text-foreground"
          />
        ))}

        {/* Data Area Fill */}
        <polygon
          points={dataPolygonString}
          fill="url(#radarGlow)"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="transition-all duration-500 ease-out"
        />

        {/* Vertex Nodes */}
        {dataPoints.map((pt, idx) => (
          <g key={idx} className="transition-all duration-500 ease-out">
            {/* Outer glow ring */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="4.5"
              fill="#8b5cf6"
              filter="url(#nodeGlow)"
            />
            {/* Inner bright point */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r="2"
              fill="#ffffff"
            />
          </g>
        ))}

        {/* Dimension Labels */}
        {dims.map((d, idx) => {
          const pos = getLabelPosition(idx);
          const anchor = getLabelAnchor(idx);
          return (
            <text
              key={d.key}
              x={pos.x}
              y={pos.y}
              textAnchor={anchor}
              className="text-[11px] font-medium fill-slate-400 dark:fill-slate-400"
            >
              {d.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
