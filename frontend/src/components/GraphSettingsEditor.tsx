import React from 'react';
import type { GraphConfig, GraphStyle } from '../types/problem';
import styles from '../styles/OutputPageStyles.module.css';

interface GraphSettingsEditorProps {
  currentConfig: GraphConfig;
  onUpdate: (newConfig: Partial<GraphConfig>) => void;
}

const GraphSettingsEditor: React.FC<GraphSettingsEditorProps> = ({ currentConfig, onUpdate }) => {
  return (
    <>
      <span className={styles.sleekSectionTitle}>Graph Layout</span>
      <div className={styles.segmentedControl}>
        {[
          { label: 'All', style: 'axes', x: [-10, 10], y: [-10, 10] },
          { label: 'Q1', style: 'quadrant1', x: [0, 10], y: [0, 10] },
          { label: 'Q2', style: 'axes', x: [-10, 0], y: [0, 10] },
          { label: 'Q3', style: 'axes', x: [-10, 0], y: [-10, 0] },
          { label: 'Q4', style: 'axes', x: [0, 10], y: [-10, 0] },
          { label: 'Off', style: 'blank-grid', x: [-10, 10], y: [-10, 10] }
        ].map((opt) => {
          const isActive =
            (currentConfig.xRange?.[0] ?? -10) === opt.x[0] &&
            (currentConfig.xRange?.[1] ?? 10) === opt.x[1] &&
            (currentConfig.yRange?.[0] ?? -10) === opt.y[0] &&
            (currentConfig.yRange?.[1] ?? 10) === opt.y[1] &&
            currentConfig.style === opt.style;

          return (
            <button
              key={opt.label}
              type="button"
              className={`${styles.segmentedBtn} ${isActive ? styles.segmentedActive : ''}`}
              onClick={() => onUpdate({ style: opt.style as GraphStyle, xRange: opt.x as [number, number], yRange: opt.y as [number, number] })}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <span className={styles.sleekSectionTitle}>Size</span>
      <div className={styles.segmentedControl}>
        {[{ id: 'sm', label: 'Small' }, { id: 'md', label: 'Medium' }, { id: 'lg', label: 'Large' }].map((opt) => (
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
              className={`${styles.segmentedBtn} ${currentConfig.step === s ? styles.segmentedActive : ''}`}
              onClick={() => onUpdate({ step: s })}
            >
              {s}
            </button>
          ))}
        </div>
        <div className={styles.axisInputWrap} style={{ width: '85px', flexShrink: 0 }}>
          <span className={styles.axisInputTag}>Step</span>
          <input
            type="text"
            className={styles.sleekInput}
            value={currentConfig.step ?? 2}
            onChange={(e) => {
              const val = e.target.value;
              const num = val === '' || val.endsWith('.') ? (val as any) : Number(val);
              onUpdate({ step: num });
            }}
          />
        </div>
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
            <input
              type="text"
              className={styles.sleekInput}
              value={currentConfig.xRange?.[0] ?? -10}
              onChange={(e) => {
                const val = e.target.value;
                const num = val === '-' || val === '' || val.endsWith('.') ? val as any : Number(val);
                onUpdate({ xRange: [num, currentConfig.xRange?.[1] ?? 10] });
              }}
            />
          </div>
          <span className={styles.sleekAxisDivider}>to</span>
          <div className={styles.axisInputWrap}>
            <span className={styles.axisInputTag}>X</span>
            <input
              type="text"
              className={styles.sleekInput}
              value={currentConfig.xRange?.[1] ?? 10}
              onChange={(e) => {
                const val = e.target.value;
                const num = val === '-' || val === '' || val.endsWith('.') ? val as any : Number(val);
                onUpdate({ xRange: [currentConfig.xRange?.[0] ?? -10, num] });
              }}
            />
          </div>
        </div>
      </div>

      <div className={styles.axisGroup}>
        <span className={styles.axisGroupLabel}>Y Axis</span>
        <div className={styles.axisInputRow}>
          <div className={styles.axisInputWrap}>
            <span className={styles.axisInputTag}>−Y</span>
            <input
              type="text"
              className={styles.sleekInput}
              value={currentConfig.yRange?.[0] ?? -10}
              onChange={(e) => {
                const val = e.target.value;
                const num = val === '-' || val === '' || val.endsWith('.') ? val as any : Number(val);
                onUpdate({ yRange: [num, currentConfig.yRange?.[1] ?? 10] });
              }}
            />
          </div>
          <span className={styles.sleekAxisDivider}>to</span>
          <div className={styles.axisInputWrap}>
            <span className={styles.axisInputTag}>Y</span>
            <input
              type="text"
              className={styles.sleekInput}
              value={currentConfig.yRange?.[1] ?? 10}
              onChange={(e) => {
                const val = e.target.value;
                const num = val === '-' || val === '' || val.endsWith('.') ? val as any : Number(val);
                onUpdate({ yRange: [currentConfig.yRange?.[0] ?? -10, num] });
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default GraphSettingsEditor;