import type { TriangleConfig } from '../types/problem';
import { isValidTriangle } from '../types/triangle';

type Pt = { x: number; y: number };

const VB = 100;
const PAD = 24;

const COLORS = {
  ink: '#16302c',
  tealDeep: '#21897e',
  tealMid: '#3ba99c',
  triangleBg: '#f6f9f8',
  white: '#ffffff'
};

const add = (p: Pt, q: Pt): Pt => ({ x: p.x + q.x, y: p.y + q.y });
const sub = (p: Pt, q: Pt): Pt => ({ x: p.x - q.x, y: p.y - q.y });
const mag = (p: Pt): number => Math.hypot(p.x, p.y);
const unit = (p: Pt): Pt => {
  const m = mag(p);
  return m === 0 ? { x: 0, y: 0 } : { x: p.x / m, y: p.y / m };
};
const scale = (p: Pt, s: number): Pt => ({ x: p.x * s, y: p.y * s });
const mid = (p: Pt, q: Pt): Pt => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const rightAngleWedge = (v: Pt, p: Pt, q: Pt, s = 6.5) => {
  const u = unit(sub(p, v));
  const t = unit(sub(q, v));
  const pt1 = add(v, scale(u, s));
  const pt3 = add(v, scale(t, s));
  const pt2 = add(pt1, scale(t, s));
  return `M ${v.x} ${v.y} L ${pt1.x} ${pt1.y} L ${pt2.x} ${pt2.y} L ${pt3.x} ${pt3.y} Z`;
};

const angleArcStroke = (v: Pt, p1: Pt, p2: Pt, r = 11) => {
  const u1 = unit(sub(p1, v));
  const u2 = unit(sub(p2, v));
  const pt1 = add(v, scale(u1, r));
  const pt2 = add(v, scale(u2, r));

  let a1 = Math.atan2(u1.y, u1.x);
  let a2 = Math.atan2(u2.y, u2.x);
  let diff = a2 - a1;
  while (diff <= -Math.PI) diff += 2 * Math.PI;
  while (diff > Math.PI) diff -= 2 * Math.PI;

  const sweep = diff > 0 ? 1 : 0;
  return `M ${pt1.x} ${pt1.y} A ${r} ${r} 0 0 ${sweep} ${pt2.x} ${pt2.y}`;
};

const sideTickPath = (p1: Pt, p2: Pt, ticks: number, tickLen = 3.5, spacing = 3) => {
  if (ticks === 0) return '';
  const m = mid(p1, p2);
  const v = unit(sub(p2, p1));
  const n = { x: -v.y, y: v.x }; 
  
  let path = '';
  const startOffset = -((ticks - 1) * spacing) / 2;
  
  for (let i = 0; i < ticks; i++) {
    const offset = startOffset + i * spacing;
    const center = add(m, scale(v, offset));
    const t1 = add(center, scale(n, tickLen));
    const t2 = add(center, scale(n, -tickLen));
    path += `M ${t1.x} ${t1.y} L ${t2.x} ${t2.y} `;
  }
  return path;
};

const detectCongruence = (v1: number, v2: number, v3: number, tol: number) => {
  const res = [0, 0, 0];
  if (Math.max(v1, v2, v3) - Math.min(v1, v2, v3) <= tol) {
    res[0] = 1; res[1] = 1; res[2] = 1;
  } else if (Math.abs(v1 - v2) <= tol) {
    res[0] = 1; res[1] = 1; 
  } else if (Math.abs(v2 - v3) <= tol) {
    res[1] = 1; res[2] = 1;
  } else if (Math.abs(v1 - v3) <= tol) {
    res[0] = 1; res[2] = 1;
  }
  return res;
};

interface Props {
  id?: string;
  config: TriangleConfig;
  size?: number;
}

export function TriangleFigure({ id, config, size = 220 }: Props) {
  const { 
    a, b, c, 
    vertexLabels, sideLabels, angleLabels,
    shapeMode = 'sides',
    anglesConfig,
    displayMode
  } = config;

  const showVertices = config.showVertices ?? (displayMode !== 'blank');
  const showSideLabels = config.showSideLabels ?? (displayMode === 'info' || displayMode === 'notations');
  const showSideCongruence = config.showSideCongruence ?? true;
  const showAngleLabels = config.showAngleLabels ?? (displayMode === 'info');
  const showAngleArcs = config.showAngleArcs ?? true; 
  const showRightAngleMarker = config.showRightAngleMarker ?? true;

  if (!isValidTriangle({ a, b, c })) return null;
  
  if (shapeMode === 'angles' && anglesConfig) {
    const valA = Number(anglesConfig.A);
    const valB = Number(anglesConfig.B);
    const valC = Number(anglesConfig.C);
    const isValid = isFinite(valA) && isFinite(valB) && isFinite(valC) && valA > 0 && valB > 0 && valC > 0;
    if (!isValid || Math.abs(valA + valB + valC - 180) > 1e-5) {
      return null; 
    }
  }

  const angARad = Math.acos(clamp((b * b + c * c - a * a) / (2 * b * c), -1, 1));
  const angBRad = Math.acos(clamp((a * a + c * c - b * b) / (2 * a * c), -1, 1));
  const angCRad = Math.acos(clamp((a * a + b * b - c * c) / (2 * a * b), -1, 1));

  const degA = angARad * (180 / Math.PI);
  const degB = angBRad * (180 / Math.PI);
  const degC = angCRad * (180 / Math.PI);

  const largest = Math.max(a, b, c);
  const pythagorasTol = largest * largest * 1e-10;
  let actualRightAngle: 'A' | 'B' | 'C' | null = null;
  
  if (Math.abs(b * b + c * c - a * a) <= pythagorasTol) actualRightAngle = 'A';
  else if (Math.abs(a * a + c * c - b * b) <= pythagorasTol) actualRightAngle = 'B';
  else if (Math.abs(a * a + b * b - c * c) <= pythagorasTol) actualRightAngle = 'C';

  const angleTol = 1e-7;
  const angCongruence = detectCongruence(degA, degB, degC, angleTol);
  const arcCounts = { A: angCongruence[0], B: angCongruence[1], C: angCongruence[2] };
  
  const sideTol = largest * 1e-9;
  const sideCongruence = detectCongruence(a, b, c, sideTol);
  const tickCounts = { a: sideCongruence[0], b: sideCongruence[1], c: sideCongruence[2] };

  const raw: Pt[] = [
    { x: 0, y: 0 },
    { x: c, y: 0 },
    { x: b * Math.cos(angARad), y: b * Math.sin(angARad) },
  ];

  const xs = raw.map((p) => p.x);
  const ys = raw.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  
  const k = (VB - 2 * PAD) / Math.max(w, h);
  const offX = (VB - w * k) / 2;
  const offY = (VB - h * k) / 2;
  
  const [A, B, C] = raw.map((p) => ({
    x: offX + (p.x - Math.min(...xs)) * k,
    y: VB - offY - (p.y - Math.min(...ys)) * k,
  }));

  const centroid: Pt = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };

  const pushOutVertex = (v: Pt, p1: Pt, p2: Pt, d: number): Pt => {
    const u1 = unit(sub(p1, v));
    const u2 = unit(sub(p2, v));
    let bisector = unit(add(u1, u2));
    bisector = scale(bisector, -1);
    if (mag(bisector) < 0.1) bisector = unit(sub(v, centroid));
    return add(v, scale(bisector, d));
  };

  const pushOutSide = (p1: Pt, p2: Pt, d: number): Pt => {
    const midpoint = mid(p1, p2);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    let nx = -dy;
    let ny = dx;
    
    if (nx * (midpoint.x - centroid.x) + ny * (midpoint.y - centroid.y) < 0) {
      nx = dy; ny = -dx;
    }
    
    const len = Math.hypot(nx, ny);
    return len === 0 ? midpoint : { x: midpoint.x + (nx / len) * d, y: midpoint.y + (ny / len) * d };
  };

  const sides = [
    { key: 'a', p: B, q: C },
    { key: 'b', p: A, q: C },
    { key: 'c', p: A, q: B },
  ] as const;

  const vertices = [
    { key: 'A', i: 0, v: A, n: [B, C] },
    { key: 'B', i: 1, v: B, n: [A, C] },
    { key: 'C', i: 2, v: C, n: [A, B] },
  ] as const;

  const textProps = {
    textAnchor: "middle" as const,
    dominantBaseline: "central" as const,
    fontFamily: "system-ui, sans-serif",
    stroke: COLORS.white,
    strokeWidth: 4, 
    paintOrder: "stroke",
    strokeLinejoin: "round" as const,
  };

  return (
    <div id={id} style={{ display: 'inline-block', background: '#fff', lineHeight: 0 }}>
      <svg viewBox={`0 0 ${VB} ${VB}`} width={size} height={size} role="img" aria-label="Triangle diagram">
        
        <polygon
          points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
          fill={COLORS.triangleBg} 
          stroke={COLORS.ink} 
          strokeWidth={1.5} 
          strokeLinejoin="round"
        />

        {showSideCongruence && sides.map(({ key, p, q }) => {
          const ticks = tickCounts[key as keyof typeof tickCounts];
          if (ticks === 0) return null;
          return (
            <path
              key={`tick-${key}`}
              d={sideTickPath(p, q, ticks)}
              stroke={COLORS.ink}
              strokeWidth={1.2}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}

        {showRightAngleMarker && vertices.map(({ key, v, n }) => {
          if (key === actualRightAngle) {
            return (
              <path 
                key={`rect-${key}`}
                d={rightAngleWedge(v, n[0], n[1])}
                fill={COLORS.tealMid}
                fillOpacity={0.15}
                stroke={COLORS.tealMid} 
                strokeWidth={1.2} 
                strokeLinejoin="miter"
              />
            );
          }
          return null;
        })}

        {showAngleArcs && vertices.map(({ key, v, n }) => {
          if (key === actualRightAngle && showRightAngleMarker) return null; 
          
          const arcsCount = arcCounts[key as keyof typeof arcCounts];
          if (arcsCount === 0) return null; 

          return (
            <g key={`arc-group-${key}`}>
              {Array.from({ length: arcsCount }).map((_, idx) => (
                <path
                  key={`arc-stroke-${key}-${idx}`}
                  d={angleArcStroke(v, n[0], n[1], 11 + idx * 3)}
                  fill="none"
                  stroke={COLORS.tealMid}
                  strokeWidth={1.2}
                />
              ))}
            </g>
          );
        })}

        {vertices.map(({ key, i, v, n }) => {
          const namePos = pushOutVertex(v, n[0], n[1], 13);
          const insideDir = unit(sub(centroid, v));
          const insidePos = add(v, scale(insideDir, 16));

          let angleTextToRender = '';
          if (showAngleLabels) angleTextToRender = angleLabels[key] || '';

          return (
            <g key={key} {...textProps}>
              {showVertices && (
                <text x={namePos.x} y={namePos.y} fontSize={7} fontWeight={700} fill={COLORS.ink}>
                  {vertexLabels[i]}
                </text>
              )}
              {angleTextToRender && (
                <text x={insidePos.x} y={insidePos.y} fontSize={5.5} fontWeight={600} fill={COLORS.tealDeep}>
                  {angleTextToRender}
                </text>
              )}
            </g>
          );
        })}

        {showSideLabels && sides.map(({ key, p, q }) => {
          let sideTextToRender = sideLabels[key] || '';
          if (displayMode === 'notations' && !sideLabels[key]) sideTextToRender = key;
          if (!sideTextToRender) return null;

          const pos = pushOutSide(p, q, 14);
          return (
            <text 
              key={key} 
              x={pos.x} 
              y={pos.y} 
              fontSize={6.5} 
              fontWeight={600}
              fill={COLORS.tealDeep}
              {...textProps}
            >
              {sideTextToRender}
            </text>
          );
        })}
      </svg>
    </div>
  );
}