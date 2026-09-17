import { Mafs, Coordinates } from 'mafs';
import 'mafs/core.css';
import { GRAPH_SIZE_PX, type GraphConfig } from '../types/problem';

export function GraphCanvas({ id, config }: { id: string; config: GraphConfig }) {
  const isQuadrant1 = config.style === 'quadrant1';
  const [xMin, xMax] = config.xRange ?? [-10, 10];
  const [yMin, yMax] = config.yRange ?? [-10, 10];
  const step = config.step ?? 2;
  const showLabels = config.showLabels ?? true;

  const labelFn = (n: number) => (showLabels && n % step === 0 ? n : '');

  return (
    <div
      id={id}
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        width: '100%',
        height: GRAPH_SIZE_PX[config.size],
        position: 'relative',
        border: '1px solid var(--border-soft, #d4e0de)',
        boxShadow: '0 4px 12px rgba(33, 137, 126, 0.06)',
        padding: '24px',
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
        overflow: visible !important;
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
        font-size: 13px !important;
        font-weight: 500;
      }
    `}</style>

      <Mafs
        viewBox={{
          x: [isQuadrant1 ? 0 : xMin, xMax],
          y: [isQuadrant1 ? 0 : yMin, yMax],
        }}
        zoom={false}
        pan={false}
      >
        {config.style === 'blank-grid' ? (
          <Coordinates.Cartesian
            xAxis={{ labels: false, axis: false }}
            yAxis={{ labels: false, axis: false }}
          />
        ) : (
          <Coordinates.Cartesian
            xAxis={{ labels: labelFn }}
            yAxis={{ labels: labelFn }}
          />
        )}
      </Mafs>
    </div>
  );
}