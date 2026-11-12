import { useState, useEffect } from 'react';
import styles from '../styles/OutputPageStyles.module.css';
import { isValidTriangle } from '../types/triangle';
import type { TriangleConfig } from '../types/problem';

interface Props {
  currentConfig: TriangleConfig;
  onUpdate: (c: Partial<TriangleConfig>) => void;
}

const SIDES = ['a', 'b', 'c'] as const;
const ANGLES = ['A', 'B', 'C'] as const;

export default function TriangleSettingsEditor({ currentConfig: cfg, onUpdate }: Props) {
  const [sideInputs, setSideInputs] = useState({
    a: String(cfg.a),
    b: String(cfg.b),
    c: String(cfg.c)
  });

  useEffect(() => {
    setSideInputs({
      a: String(cfg.a),
      b: String(cfg.b),
      c: String(cfg.c)
    });
  }, [cfg.a, cfg.b, cfg.c]);

  const handleSideChange = (side: 'a' | 'b' | 'c', value: string) => {
    setSideInputs(prev => ({ ...prev, [side]: value }));
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue > 0) {
      onUpdate({ [side]: numValue });
    }
  };

  const shapeMode = cfg.shapeMode || 'sides'; 
  const anglesCfg = cfg.anglesConfig || { A: '60', B: '60', C: '60' };

  const showVertices = cfg.showVertices ?? (cfg.displayMode !== 'blank');
  const showSideLabels = cfg.showSideLabels ?? (cfg.displayMode === 'info' || cfg.displayMode === 'notations');
  const showSideCongruence = cfg.showSideCongruence ?? true;
  const showAngleLabels = cfg.showAngleLabels ?? (cfg.displayMode === 'info');
  const showAngleArcs = cfg.showAngleArcs ?? true;
  const showRightAngleMarker = cfg.showRightAngleMarker ?? true;

  const valid = isValidTriangle(cfg);

  const handleModeChange = (newMode: 'sides' | 'angles') => {
    if (newMode === shapeMode) return;
    
    const updates: Partial<TriangleConfig> = { shapeMode: newMode };

    if (newMode === 'angles' && valid) {
      const a = cfg.a, b = cfg.b, c = cfg.c;
      const angARad = Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / (2 * b * c))));
      const angBRad = Math.acos(Math.max(-1, Math.min(1, (a * a + c * c - b * b) / (2 * a * c))));
      const angCRad = Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - c * c) / (2 * a * b))));
      
      const formatAng = (rad: number) => {
        const deg = rad * (180 / Math.PI);
        return Math.abs(deg - Math.round(deg)) < 1e-5 ? String(Math.round(deg)) : deg.toFixed(2);
      };

      updates.anglesConfig = {
        A: formatAng(angARad),
        B: formatAng(angBRad),
        C: formatAng(angCRad),
      };
    }
    
    onUpdate(updates);
  };

  const handleAngleChange = (angle: 'A'|'B'|'C', val: string) => {
    const newAngles = { ...anglesCfg, [angle]: val };
    const updates: Partial<TriangleConfig> = { anglesConfig: newAngles };
    
    const A = Number(newAngles.A);
    const B = Number(newAngles.B);
    const C = Number(newAngles.C);
    const sum = A + B + C;
    
    const isValidAngle = (v: number) => isFinite(v) && v > 0;
    
    if (isValidAngle(A) && isValidAngle(B) && isValidAngle(C) && Math.abs(sum - 180) < 1e-5) {
      const rad = Math.PI / 180;
      updates.a = Math.sin(A * rad) * 10;
      updates.b = Math.sin(B * rad) * 10;
      updates.c = Math.sin(C * rad) * 10;
    }
    
    onUpdate(updates);
  };

  return (
    <div>
      <span className={styles.sleekSectionTitle}>Triangle Settings</span>

      <div className={styles.axisGroup}>
        <div className={styles.sleekToggleList}>
          <label className={styles.sleekToggle}>
            <input type="checkbox" checked={showVertices} onChange={(e) => onUpdate({ showVertices: e.target.checked })} />
            <span>Vertices (A, B, C)</span>
          </label>
          <label className={styles.sleekToggle}>
            <input type="checkbox" checked={showSideLabels} onChange={(e) => onUpdate({ showSideLabels: e.target.checked })} />
            <span>Side length labels</span>
          </label>
          <label className={styles.sleekToggle}>
            <input type="checkbox" checked={showSideCongruence} onChange={(e) => onUpdate({ showSideCongruence: e.target.checked })} />
            <span>Side congruence marks</span>
          </label>
          <label className={styles.sleekToggle}>
            <input type="checkbox" checked={showAngleLabels} onChange={(e) => onUpdate({ showAngleLabels: e.target.checked })} />
            <span>Interior angle labels</span>
          </label>
          <label className={styles.sleekToggle}>
            <input type="checkbox" checked={showAngleArcs} onChange={(e) => onUpdate({ showAngleArcs: e.target.checked })} />
            <span>Angle congruence arcs</span>
          </label>
          <label className={styles.sleekToggle}>
            <input type="checkbox" checked={showRightAngleMarker} onChange={(e) => onUpdate({ showRightAngleMarker: e.target.checked })} />
            <span>Right angle marker</span>
          </label>
        </div>
      </div>

      <div className={styles.axisGroup} style={{ marginTop: '20px' }}>
        <span className={styles.axisGroupLabel}>Define shape by</span>
        <div className={styles.segmentedControl} style={{ marginBottom: '10px' }}>
          <button 
            className={`${styles.segmentedBtn} ${shapeMode === 'sides' ? styles.segmentedActive : ''}`}
            onClick={() => handleModeChange('sides')}
          >
            Side Proportions
          </button>
          <button 
            className={`${styles.segmentedBtn} ${shapeMode === 'angles' ? styles.segmentedActive : ''}`}
            onClick={() => handleModeChange('angles')}
          >
            Interior Angles
          </button>
        </div>

        {shapeMode === 'sides' ? (
          <div className={styles.axisInputRow}>
            {SIDES.map((s) => (
              <label key={s} className={styles.axisInputWrap}>
                <span className={styles.axisInputTag}>{s}</span>
                <input
                  className={styles.sleekInput}
                  type="number" 
                  min={0.1} 
                  step={0.5}
                  value={sideInputs[s]}
                  onChange={(e) => handleSideChange(s, e.target.value)}
                />
              </label>
            ))}
          </div>
        ) : (
          <div className={styles.axisInputRow}>
            {ANGLES.map((v) => (
              <label key={v} className={styles.axisInputWrap}>
                <span className={styles.axisInputTag}>{v}°</span>
                <input
                  className={styles.sleekInput}
                  type="number"
                  value={anglesCfg[v]}
                  onChange={(e) => handleAngleChange(v, e.target.value)}
                />
              </label>
            ))}
          </div>
        )}

        {shapeMode === 'sides' && !valid && (
          <div style={{
            backgroundColor: 'rgba(59, 169, 156, 0.1)',
            border: '1px solid rgba(59, 169, 156, 0.3)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginTop: '12px',
            color: '#16302c',
            fontSize: '13px',
            fontWeight: 500
          }}>
            <span>These proportions cannot form a valid triangle.</span>
          </div>
        )}

        {shapeMode === 'angles' && (
          (() => {
            const A = Number(anglesCfg.A);
            const B = Number(anglesCfg.B);
            const C = Number(anglesCfg.C);
            const sum = A + B + C;
            
            const isComplete = anglesCfg.A !== '' && anglesCfg.B !== '' && anglesCfg.C !== '';
            const hasInvalid = isComplete && (!isFinite(A) || !isFinite(B) || !isFinite(C) || A <= 0 || B <= 0 || C <= 0);
            const wrongSum = isComplete && !hasInvalid && Math.abs(sum - 180) > 1e-5;

            if (hasInvalid || wrongSum) {
              return (
                <div style={{
                  backgroundColor: 'rgba(59, 169, 156, 0.1)',
                  border: '1px solid rgba(59, 169, 156, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginTop: '12px',
                  color: '#16302c',
                  fontSize: '13px',
                  fontWeight: 500
                }}>
                  <span>
                    {hasInvalid 
                      ? 'All angles must be valid positive numbers.' 
                      : `Angles must sum to exactly 180° (Currently: `}
                    {!hasInvalid && <strong style={{ fontWeight: 700 }}>{Number.isInteger(sum) ? sum : sum.toFixed(2)}°</strong>}
                    {!hasInvalid && ')'}
                  </span>
                </div>
              );
            }
            return null;
          })()
        )}
      </div>

      {showSideLabels && (
        <div className={styles.axisGroup} style={{ marginTop: '16px' }}>
          <span className={styles.axisGroupLabel}>Side text labels</span>
          <div className={styles.axisInputRow}>
            {SIDES.map((s) => (
              <label key={s} className={styles.axisInputWrap}>
                <span className={styles.axisInputTag}>{s}</span>
                <input
                  className={styles.sleekInput}
                  value={cfg.sideLabels[s] || ''}
                  onChange={(e) => onUpdate({ sideLabels: { ...cfg.sideLabels, [s]: e.target.value } })}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {showAngleLabels && (
        <div className={styles.axisGroup} style={{ marginTop: '16px' }}>
          <span className={styles.axisGroupLabel}>Angle text labels</span>
          <div className={styles.axisInputRow}>
            {ANGLES.map((v) => (
              <label key={v} className={styles.axisInputWrap}>
                <span className={styles.axisInputTag}>{v}</span>
                <input
                  className={styles.sleekInput}
                  value={cfg.angleLabels[v] || ''}
                  onChange={(e) => onUpdate({ angleLabels: { ...cfg.angleLabels, [v]: e.target.value } })}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}