import { Mafs, Coordinates } from 'mafs';
import 'mafs/core.css';
import { GRAPH_SIZE_PX, type GraphConfig } from '../types/problem';

const MAX_ABS = 1_000_000;
const MAX_LINES = 20;
const BORDER = 1;
const MARGIN = 28; 
const MIN_GAP_X = 34; 
const MIN_GAP_Y = 20; 

const safeNum = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.max(-MAX_ABS, Math.min(MAX_ABS, v))
    : fallback;

const niceStep = (raw: number) => {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * pow;
};

const effectiveStep = (step: number, min: number, max: number) => {
  const range = max - min;
  return range / step > MAX_LINES ? Math.max(step, niceStep(range / 10)) : step;
};

const labelEvery = (lineStep: number, range: number, plotPx: number, minGap: number) => {
  const pxPerLine = (lineStep / range) * plotPx;
  return Math.max(1, Math.ceil(minGap / pxPerLine));
};

const formatLabel = (n: number) => {
  const clean = Number(n.toPrecision(12));
  if (Math.abs(clean) >= 10000) {
    return clean.toLocaleString('en', { notation: 'compact', maximumFractionDigits: 1 });
  }
  return String(clean);
};

const makeLabels = (show: boolean, lineStep: number, every: number) => (n: number) => {
  if (!show) return '';
  const k = n / (lineStep * every);
  return Math.abs(k - Math.round(k)) < 1e-6 ? formatLabel(n) : '';
};

export function GraphCanvas({ id, config }: { id: string; config: GraphConfig }) {
  let xMin = safeNum(config.xRange?.[0], -10);
  let xMax = safeNum(config.xRange?.[1], 10);
  let yMin = safeNum(config.yRange?.[0], -10);
  let yMax = safeNum(config.yRange?.[1], 10);
  if (xMin >= xMax) [xMin, xMax] = [-10, 10];
  if (yMin >= yMax) [yMin, yMax] = [-10, 10];

  const rawStep = safeNum(config.step, 2);
  const step = rawStep > 0 ? rawStep : 2;
  const stepX = effectiveStep(step, xMin, xMax);
  const stepY = effectiveStep(step, yMin, yMax);
  const showLabels = config.showLabels ?? true;
  const style = config.style ?? 'axes';

  const side = GRAPH_SIZE_PX[config.size] ?? 320;
  const inner = side - BORDER * 2;
  const plotPx = inner - MARGIN * 2;
  const fontSize = side <= 220 ? 10 : 12;

  const padX = ((xMax - xMin) / plotPx) * MARGIN;
  const padY = ((yMax - yMin) / plotPx) * MARGIN;
  const viewX: [number, number] = [xMin - padX, xMax + padX];
  const viewY: [number, number] = [yMin - padY, yMax + padY];

  const everyX = labelEvery(stepX, xMax - xMin, plotPx, MIN_GAP_X);
  const everyY = labelEvery(stepY, yMax - yMin, plotPx, MIN_GAP_Y);
  const labelsX = makeLabels(showLabels, stepX, everyX);
  const labelsY = makeLabels(showLabels, stepY, everyY);

  const mafsKey = [style, xMin, xMax, yMin, yMax, stepX, stepY, inner].join('|');

  return (
    <div
      id={id}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        overflow: 'hidden',
        width: side,
        maxWidth: '100%',
        height: side,
        position: 'relative',
        border: `${BORDER}px solid var(--border-strong, rgba(33, 137, 126, 0.38))`,
        boxShadow: '0 4px 12px rgba(33, 137, 126, 0.06)',
        boxSizing: 'border-box',
        '--mafs-bg': '#ffffff',
        '--mafs-fg': '#1a1a1a',
        '--mafs-line-color': '#16302c',
        '--mafs-axis-stroke-width': '2px',
      } as React.CSSProperties}
    >
      <style>{`
      #${id} .MafsView, #${id} svg {
        background-color: transparent !important;
        overflow: hidden !important;
      }

      #${id} svg line {
        stroke: rgba(33, 137, 126, 0.0) !important; 
        stroke-width: 1px !important;
      }

      #${id} svg line[x1="0"][x2="0"],
      #${id} svg line[y1="0"][y2="0"] {
        stroke: rgba(33, 137, 126, 0.7) !important; 
        stroke-width: 2px !important; 
      }

      #${id} svg text {
        fill: #4d6460 !important; 
        stroke: none !important;
        font-family: inherit !important;
        font-size: ${fontSize}px !important;
        font-weight: 500;
      }
    `}</style>

      <Mafs
        key={mafsKey}
        width={inner}
        height={inner}
        preserveAspectRatio={false}
        viewBox={{ x: viewX, y: viewY, padding: 0 }}
        zoom={false}
        pan={false}
      >
        {style === 'blank-grid' ? (
          <Coordinates.Cartesian
            xAxis={{ lines: stepX, labels: false, axis: false }}
            yAxis={{ lines: stepY, labels: false, axis: false }}
          />
        ) : (
          <Coordinates.Cartesian
            xAxis={{ lines: stepX, labels: labelsX }}
            yAxis={{ lines: stepY, labels: labelsY }}
          />
        )}
      </Mafs>
    </div>
  );
}