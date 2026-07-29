import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Stepper, { type StepDef } from '../components/Stepper';
import { MOCK_PROFILE, generateMockSet } from '../services/mockData';
import {
  DIFFICULTIES,
  DISPLAY_OPTIONS,
  OUTPUT_INCLUDES,
  PROBLEM_FORMATS,
  SCAFFOLDING_LEVELS,
  initialGeneratorForm,
  type DisplayOption,
  type GeneratorFormData,
  type OutputInclude,
  type PrepLevel,
  type ScaffoldingLevel,
} from '../types/problem';
import styles from '../styles/GeneratorPageStyles.module.css';

const steps: StepDef[] = [
  { number: 1, title: 'Scope & alignment' },
  { number: 2, title: 'Difficulty & support' },
  { number: 3, title: 'Output & presentation' },
  { number: 4, title: 'Review & generate' },
];

const DEFAULTS_KEY = 'mathcraft_generator_defaults';
const DRAFT_KEY = 'mathcraft_generator_draft';
const HISTORY_KEY = 'mathcraft_history';
const LAST_SET_KEY = 'mathcraft_last_generated_set';

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const icons = {
  layers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="m12 3 8.5 5-8.5 5-8.5-5L12 3Z" />
      <path d="m3.5 13 8.5 5 8.5-5" />
    </svg>
  ),
  spark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8" />
    </svg>
  ),
};

const Generator = (): React.ReactElement => {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = MOCK_PROFILE;
  const prepLevel: PrepLevel = (location.state as { prepLevel?: PrepLevel } | null)?.prepLevel
    ?? profile.prepLevels[0];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savedDefaultsNotice, setSavedDefaultsNotice] = useState(false);
  const [formData, setFormData] = useState<GeneratorFormData>(initialGeneratorForm);
  const [fontSize, setFontSize] = useState<'default' | 'comfortable' | 'large'>(
    () => (localStorage.getItem('generatorFontSize') as 'default' | 'comfortable' | 'large') || 'comfortable',
  );

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    const defaults = localStorage.getItem(DEFAULTS_KEY);
    try {
      const base = defaults ? { ...initialGeneratorForm, ...JSON.parse(defaults) } : initialGeneratorForm;
      const merged = saved ? { ...base, ...JSON.parse(saved) } : base;
      setFormData(merged);
    } catch {
    }
  }, []);

  const persistDraft = (next: GeneratorFormData) => {
    setFormData(next);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  };

  const changeFontSize = (size: 'default' | 'comfortable' | 'large') => {
    setFontSize(size);
    localStorage.setItem('generatorFontSize', size);
  };

  const updateCount = (format: GeneratorFormData['problemTypeCounts'][number]['format'], count: number) => {
    persistDraft({
      ...formData,
      problemTypeCounts: formData.problemTypeCounts.map((p) => (p.format === format ? { ...p, count } : p)),
    });
  };

  const totalQuestions = formData.problemTypeCounts.reduce((sum, p) => sum + p.count, 0);

  const goNext = () => {
    if (step === 1 && !formData.topic.trim()) return;
    setStep((s) => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrevious = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveAsDefault = () => {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(formData));
    setSavedDefaultsNotice(true);
    setTimeout(() => setSavedDefaultsNotice(false), 2200);
  };

  const promptPreview = [
    `Topic: ${formData.topic || 'None'}`,
    formData.learningStandard ? `Standard: ${formData.learningStandard}` : null,
    `Formats: ${formData.problemFormats.join(', ') || 'None'}`,
    `Difficulty: ${formData.difficulty}`,
    `Scaffolding: ${formData.scaffolding.join(', ') || 'None'}`,
    formData.customRules ? `Rules: ${formData.customRules}` : null,
    `Total questions: ${totalQuestions}`,
    `Output includes: ${formData.outputIncludes.join(', ') || 'None'}`,
    `Order: ${formData.questionOrder}, grouped by ${formData.groupBy}`,
  ].filter(Boolean).join('\n');

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => {
      const questions = generateMockSet(formData, prepLevel);
      const generatedSet = {
        id: `set_${Date.now()}`,
        topic: formData.topic,
        createdAt: new Date().toISOString(),
        prepLevel,
        formData,
        questions,
      };
      localStorage.setItem(LAST_SET_KEY, JSON.stringify(generatedSet));
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      localStorage.setItem(HISTORY_KEY, JSON.stringify([generatedSet, ...history].slice(0, 50)));
      localStorage.removeItem(DRAFT_KEY);
      setLoading(false);
      navigate('/results');
    }, 600);
  };

  return (
    <main className={`${styles.generatorPage} ${styles[`font-${fontSize}`]}`}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="MathCraft home">
          <span className={styles.brandMark}>M</span>
          <span>MathCraft</span>
        </a>
        <div className={styles.topbarActions}>
          <div className={styles.toolDock}>
            <div className={styles.fontControls} aria-label="Text size">
              <span>Aa</span>
              <button className={fontSize === 'default' ? styles.selected : ''} onClick={() => changeFontSize('default')}>A−</button>
              <button className={fontSize === 'comfortable' ? styles.selected : ''} onClick={() => changeFontSize('comfortable')}>A</button>
              <button className={fontSize === 'large' ? styles.selected : ''} onClick={() => changeFontSize('large')}>A+</button>
            </div>
            <span className={styles.draftStatus}><i /> Draft saved</span>
          </div>
          <button className={styles.profileButton} onClick={() => navigate('/account')}>Profile</button>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={styles.intro}>
          <h1>Create problem set</h1>
        </section>

        <Stepper steps={steps} currentStep={step} onStepClick={setStep} />

        <div className={styles.layout}>
          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <span>STEP {step} OF 4</span>
              <h2>{steps[step - 1].title}</h2>
              <p>{[
                'Start with the learning goal and the format students will see.',
                'Adjust the difficulty, scaffolding, and number of questions.',
                'Decide what shows up in the final output and save it as your default.',
                'Check your choices, then generate the set.',
              ][step - 1]}</p>
            </div>

            {step === 1 && (
              <div className={styles.formGrid}>
                <label className={`${styles.field} ${styles.full}`}>
                  <span>Learning standard <em>Optional</em></span>
                  <input
                    value={formData.learningStandard}
                    onChange={(e) => persistDraft({ ...formData, learningStandard: e.target.value })}
                    placeholder="e.g., QC Progression of Learning, Proportionality"
                  />
                </label>

                <label className={`${styles.field} ${styles.full}`}>
                  <span>Topic or concept *</span>
                  <textarea
                    rows={2}
                    value={formData.topic}
                    onChange={(e) => persistDraft({ ...formData, topic: e.target.value })}
                    placeholder="e.g., Compare proportional relationships using tables and graphs"
                  />
                  <small className={styles.hint}>Be specific about what students should practice.</small>
                </label>

                <div className={`${styles.field} ${styles.full}`}>
                  <span>Problem format <em>Select all that apply</em></span>
                  <div className={styles.checkGrid}>
                    {PROBLEM_FORMATS.map((f) => (
                      <label key={f} className={styles.checkCard}>
                        <input
                          type="checkbox"
                          checked={formData.problemFormats.includes(f)}
                          onChange={() => persistDraft({ ...formData, problemFormats: toggleInArray(formData.problemFormats, f) })}
                        />
                        <span className={styles.checkBox}>✓</span>
                        <span>{f}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className={styles.field}>
                  <span>Real-world context <em>Optional</em></span>
                  <input
                    value={formData.realWorldContext}
                    onChange={(e) => persistDraft({ ...formData, realWorldContext: e.target.value })}
                    placeholder="e.g., sports, music, local community"
                  />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.full}`}>
                  <span>Difficulty</span>
                  <div className={styles.checkGrid}>
                    {DIFFICULTIES.map(({ value, helper }) => (
                      <label key={value} className={`${styles.radioCard} ${formData.difficulty === value ? styles.radioCardActive : ''}`}>
                        <input
                          type="radio"
                          name="difficulty"
                          checked={formData.difficulty === value}
                          onChange={() => persistDraft({ ...formData, difficulty: value })}
                        />
                        <div>
                          <strong>{value}</strong>
                          <small>{helper}</small>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={`${styles.field} ${styles.full}`}>
                  <span>Scaffolding level <em>Select all that apply</em></span>
                  <div className={styles.chipRow}>
                    {SCAFFOLDING_LEVELS.map((s) => (
                      <button
                        type="button"
                        key={s}
                        className={`${styles.chip} ${formData.scaffolding.includes(s) ? styles.chipActive : ''}`}
                        onClick={() => {
                          const next: ScaffoldingLevel[] = s === 'None'
                            ? ['None']
                            : toggleInArray(formData.scaffolding.filter((v) => v !== 'None'), s);
                          persistDraft({ ...formData, scaffolding: next.length ? next : ['None'] });
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <label className={`${styles.field} ${styles.full}`}>
                  <span>Custom rules <em>Optional</em></span>
                  <textarea
                    rows={2}
                    value={formData.customRules}
                    onChange={(e) => persistDraft({ ...formData, customRules: e.target.value })}
                    placeholder="e.g., Use whole numbers only, avoid negative answers"
                  />
                </label>

                <div className={`${styles.field} ${styles.full}`}>
                  <span>Problem types &amp; counts</span>
                  <div className={styles.countList}>
                    {formData.problemTypeCounts.map((entry) => (
                      <div key={entry.format} className={styles.countRow}>
                        <span>{entry.format}</span>
                        <div className={styles.counter}>
                          <button
                            type="button"
                            onClick={() => updateCount(entry.format, Math.max(0, entry.count - 1))}
                            disabled={entry.count <= 0}
                            aria-label={`Decrease ${entry.format} count`}
                          >
                            −
                          </button>
                          <span className={styles.counterValue}>{entry.count}</span>
                          <button
                            type="button"
                            onClick={() => updateCount(entry.format, Math.min(30, entry.count + 1))}
                            disabled={entry.count >= 30}
                            aria-label={`Increase ${entry.format} count`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className={styles.totalLine}>Total questions: <strong>{totalQuestions}</strong></p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.full}`}>
                  <span>Include in output <em>Select all that apply</em></span>
                  <div className={styles.checkGrid}>
                    {OUTPUT_INCLUDES.map((o: OutputInclude) => (
                      <label key={o} className={styles.checkCard}>
                        <input
                          type="checkbox"
                          checked={formData.outputIncludes.includes(o)}
                          onChange={() => persistDraft({ ...formData, outputIncludes: toggleInArray(formData.outputIncludes, o) })}
                        />
                        <span className={styles.checkBox}>✓</span>
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={`${styles.field} ${styles.full}`}>
                  <span>Display options <em>Select all that apply</em></span>
                  <div className={styles.checkGrid}>
                    {DISPLAY_OPTIONS.map((d: DisplayOption) => (
                      <label key={d} className={styles.checkCard}>
                        <input
                          type="checkbox"
                          checked={formData.displayOptions.includes(d)}
                          onChange={() => persistDraft({ ...formData, displayOptions: toggleInArray(formData.displayOptions, d) })}
                        />
                        <span className={styles.checkBox}>✓</span>
                        <span>{d}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className={styles.field}>
                  <span>Question order</span>
                  <select
                    value={formData.questionOrder}
                    onChange={(e) => persistDraft({ ...formData, questionOrder: e.target.value as GeneratorFormData['questionOrder'] })}
                  >
                    {(['By topic', 'By difficulty', 'Mixed', 'Random'] as const).map((v) => <option key={v}>{v}</option>)}
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Group by</span>
                  <select
                    value={formData.groupBy}
                    onChange={(e) => persistDraft({ ...formData, groupBy: e.target.value as GeneratorFormData['groupBy'] })}
                  >
                    {(['None', 'Topic', 'Difficulty', 'Format'] as const).map((v) => <option key={v}>{v}</option>)}
                  </select>
                </label>

                <div className={`${styles.field} ${styles.full} ${styles.saveDefaultRow}`}>
                  <button type="button" className={styles.secondaryButton} onClick={handleSaveAsDefault}>
                    Save as default
                  </button>
                  {savedDefaultsNotice && <span className={styles.savedNotice}>Saved to your profile defaults ✓</span>}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className={styles.review}>
                <div className={styles.reviewCallout}>
                  <span>✓</span>
                  <div>
                    <strong>Ready to create your problem set</strong>
                    <p>Review the details below, then create the problem set for {prepLevel}.</p>
                  </div>
                </div>
                <div className={styles.reviewGrid}>
                  <div>
                    <small>LEARNING GOAL</small>
                    <strong>{formData.topic || 'Not specified'}</strong>
                    <p>{prepLevel} · {profile.subjects[0]}{formData.learningStandard ? ` · ${formData.learningStandard}` : ''}</p>
                  </div>
                  <div>
                    <small>CHALLENGE</small>
                    <strong>{formData.difficulty}</strong>
                    <p>{formData.scaffolding.join(', ')} support</p>
                  </div>
                  <div>
                    <small>DELIVERABLE</small>
                    <strong>{totalQuestions} questions</strong>
                    <p>{formData.problemFormats.join(', ') || 'No formats selected'}</p>
                  </div>
                  <div>
                    <small>OUTPUT</small>
                    <strong>{formData.outputIncludes.join(', ') || 'Problems only'}</strong>
                    <p>{formData.questionOrder} · grouped by {formData.groupBy}</p>
                  </div>
                </div>
              </div>
            )}

            <div className={styles.cardActions}>
              {step > 1 ? <button className={styles.secondaryButton} onClick={goPrevious}>← Previous</button> : <span />}
              {step < 4 ? (
                <button
                  className={styles.primaryButton}
                  onClick={goNext}
                  disabled={step === 1 && !formData.topic.trim()}
                >
                  Continue <span>→</span>
                </button>
              ) : (
                <button className={`${styles.primaryButton} ${styles.generate}`} onClick={handleGenerate} disabled={loading || totalQuestions === 0}>
                  {loading ? 'Generating…' : 'Generate problems'} <span>✦</span>
                </button>
              )}
            </div>
          </section>

          <aside className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              <span className={styles.sidebarLabel}>Generating for</span>
              <div className={styles.sidebarPrep}>
                <span className={styles.sidebarPrepIcon} aria-hidden="true">{icons.layers}</span>
                <div>
                  <strong>{prepLevel}</strong>
                  <small>{profile.subjects[0]}</small>
                </div>
              </div>
            </div>

            <div className={styles.sidebarCard}>
              <span className={styles.sidebarLabel}>
                <span className={styles.sidebarLabelIcon} aria-hidden="true">{icons.spark}</span>
                Prompt Preview
              </span>
              <pre className={styles.promptPreview}>{promptPreview}</pre>
            </div>

            <div className={styles.sidebarStat}>
              <span>Total questions</span>
              <strong>{totalQuestions}</strong>
            </div>
          </aside>
        </div>

        <p className={styles.privacyNote}>Your draft is stored only in this browser.</p>
      </div>
    </main>
  );
};

export default Generator;