import React, { useEffect, useState } from 'react';
import type { GraphConfig, GraphStyle } from '../types/problem';
import styles from '../styles/OutputPageStyles.module.css';

const MAX_ABS = 1_000_000;

interface GraphSettingsEditorProps {
  currentConfig: GraphConfig;
  onUpdate: (newConfig: Partial<GraphConfig>) => void;
}

interface NumberFieldProps {
  value: number;
  onCommit: (n: number) => void;
  isValid?: (n: number) => boolean;
  autoFocus?: boolean;
}

const NumberField: React.FC<NumberFieldProps> = ({ value, onCommit, isValid = () => true, autoFocus }) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft((prev) => {
      const parsed = parseFloat(prev);
      if (parsed === value) return prev; 
      if (prev === '-' || prev === '' || prev === '-.') return prev;
      return String(value);
    });
  }, [value]);

  const commit = () => {
    const n = parseFloat(draft);
    if (Number.isFinite(n) && Math.abs(n) <= MAX_ABS && isValid(n)) {
      if (n !== value) onCommit(n);
      setDraft(String(n));
    } else {
      setDraft(String(value));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={styles.sleekInput}
      value={draft}
      autoFocus={autoFocus}
      onChange={(e) => {
        const raw = e.target.value;
        if (/^-?\d*\.?\d*$/.test(raw)) {
          setDraft(raw);
          
          const n = parseFloat(raw);
          if (!isNaN(n) && Number.isFinite(n) && Math.abs(n) <= MAX_ABS && isValid(n)) {
            if (!raw.endsWith('.')) {
              onCommit(n);
            }
          }
        }
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(String(value));
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
};

const PRESETS: {
  label: string;
  style: GraphStyle;
  x: [number, number];
  y: [number, number];
}[] = [
  { label: 'All', style: 'axes' as GraphStyle, x: [-10, 10], y: [-10, 10] },
  { label: 'Q1', style: 'quadrant1' as GraphStyle, x: [0, 10], y: [0, 10] },
  { label: 'Q2', style: 'axes' as GraphStyle, x: [-10, 0], y: [0, 10] },
  { label: 'Q3', style: 'axes' as GraphStyle, x: [-10, 0], y: [-10, 0] },
  { label: 'Q4', style: 'axes' as GraphStyle, x: [0, 10], y: [-10, 0] },
  { label: 'Off', style: 'blank-grid' as GraphStyle, x: [-10, 10], y: [-10, 10] },
];

const GraphSettingsEditor: React.FC<GraphSettingsEditorProps> = ({ currentConfig, onUpdate }) => {
  const [xMin, xMax] = currentConfig.xRange ?? [-10, 10];
  const [yMin, yMax] = currentConfig.yRange ?? [-10, 10];
  const step = currentConfig.step ?? 2;

  const [isCustomMode, setIsCustomMode] = useState(![1, 2, 5].includes(step));

  useEffect(() => {
    if (![1, 2, 5].includes(step)) {
      setIsCustomMode(true);
    }
  }, [step]);

  return (
    <>
      <span className={styles.sleekSectionTitle}>Graph Layout</span>
      <div className={styles.segmentedControl}>
        {PRESETS.map((opt) => {
          const isActive =
            xMin === opt.x[0] &&
            xMax === opt.x[1] &&
            yMin === opt.y[0] &&
            yMax === opt.y[1] &&
            (currentConfig.style ?? 'axes') === opt.style;

          return (
            <button
              key={opt.label}
              type="button"
              className={`${styles.segmentedBtn} ${isActive ? styles.segmentedActive : ''}`}
              onClick={() => onUpdate({ style: opt.style, xRange: opt.x, yRange: opt.y })}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <span className={styles.sleekSectionTitle}>Size</span>
      <div className={styles.segmentedControl}>
        {[
          { id: 'sm', label: 'Small' },
          { id: 'md', label: 'Medium' },
          { id: 'lg', label: 'Large' },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`${styles.segmentedBtn} ${currentConfig.size === opt.id ? styles.segmentedActive : ''}`}
            onClick={() => onUpdate({ size: opt.id as 'sm' | 'md' | 'lg' })}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <span className={styles.sleekSectionTitle}>Scale</span>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <div className={styles.segmentedControl} style={{ flex: 1 }}>
          {[1, 2, 5].map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.segmentedBtn} ${!isCustomMode && step === s ? styles.segmentedActive : ''}`}
              onClick={() => {
                setIsCustomMode(false);
                onUpdate({ step: s });
              }}
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            className={`${styles.segmentedBtn} ${isCustomMode ? styles.segmentedActive : ''}`}
            onClick={() => setIsCustomMode(true)}
          >
            Custom
          </button>
        </div>
        
        {isCustomMode && (
          <div className={styles.customStepWrap}>
            <NumberField
              value={step}
              isValid={(n) => n > 0}
              onCommit={(n) => onUpdate({ step: n })}
              autoFocus
            />
          </div>
        )}
      </div>

      <label className={styles.sleekToggle} style={{ marginBottom: '12px' }}>
        <input
          type="checkbox"
          checked={currentConfig.showLabels ?? true}
          onChange={(e) => onUpdate({ showLabels: e.target.checked })}
        />
        <span>Show axis labels</span>
      </label>

      <span className={styles.sleekSectionTitle}>Axis Range</span>
      <div className={styles.axisGroup}>
        <span className={styles.axisGroupLabel}>X Axis</span>
        <div className={styles.axisInputRow}>
          <div className={styles.axisInputWrap}>
            <span className={styles.axisInputTag}>−X</span>
            <NumberField
              value={xMin}
              isValid={(n) => n < xMax}
              onCommit={(n) => onUpdate({ xRange: [n, xMax] })}
            />
          </div>
          <span className={styles.sleekAxisDivider}>to</span>
          <div className={styles.axisInputWrap}>
            <span className={styles.axisInputTag}>X</span>
            <NumberField
              value={xMax}
              isValid={(n) => n > xMin}
              onCommit={(n) => onUpdate({ xRange: [xMin, n] })}
            />
          </div>
        </div>
      </div>

      <div className={styles.axisGroup}>
        <span className={styles.axisGroupLabel}>Y Axis</span>
        <div className={styles.axisInputRow}>
          <div className={styles.axisInputWrap}>
            <span className={styles.axisInputTag}>−Y</span>
            <NumberField
              value={yMin}
              isValid={(n) => n < yMax}
              onCommit={(n) => onUpdate({ yRange: [n, yMax] })}
            />
          </div>
          <span className={styles.sleekAxisDivider}>to</span>
          <div className={styles.axisInputWrap}>
            <span className={styles.axisInputTag}>Y</span>
            <NumberField
              value={yMax}
              isValid={(n) => n > yMin}
              onCommit={(n) => onUpdate({ yRange: [yMin, n] })}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default GraphSettingsEditor;