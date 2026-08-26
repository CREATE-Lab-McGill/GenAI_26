import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Stepper, { type StepDef } from '../components/Stepper';
import InfoTooltip from '../components/InfoTootip';
import FeedbackButton from '../components/Feedback';
import ProfileButton from '../components/Profile';
import { MOCK_PROFILE } from '../services/mockData';
import type { GeneratedQuestion } from '../types/problem';
import { generateSet } from '../api/client';
import {
  DIFFICULTIES,
  PROBLEM_FORMATS,
  SCAFFOLDING_LEVELS,
  PREP_LEVELS,
  initialGeneratorForm,
  type DisplayOption,
  type GeneratorFormData,
  type OutputInclude,
  type PrepLevel,
  type ScaffoldingLevel,
  type QuestionGroup,
} from '../types/problem';
import styles from '../styles/GeneratorPageStyles.module.css';
import { CURRICULUM_DATA } from '../services/curriculumData';

const steps: StepDef[] = [
  { number: 1, title: 'Scope & alignment' },
  { number: 2, title: 'Difficulty & support' },
  { number: 3, title: 'Output & presentation' },
  { number: 4, title: 'Review & generate' },
];

const DEFAULTS_KEY = 'mathcraft_generator_defaults';
const DRAFT_KEY = 'mathcraft_generator_draft';
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

  const [activePrepLevel, setActivePrepLevel] = useState<PrepLevel>(
    (location.state as { prepLevel?: PrepLevel } | null)?.prepLevel ?? profile.prepLevels[0]
  );

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
      const parsedDefaults = defaults ? JSON.parse(defaults) : null;
      const base = parsedDefaults
        ? {
          ...initialGeneratorForm,
          outputIncludes: parsedDefaults.outputIncludes ?? initialGeneratorForm.outputIncludes,
          displayOptions: parsedDefaults.displayOptions ?? initialGeneratorForm.displayOptions,
        }
        : initialGeneratorForm;
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

  const addGroup = () => {
    persistDraft({
      ...formData,
      questionGroups: [
        ...formData.questionGroups,
        {
          id: `group_${Date.now()}`,
          count: 1,
          format: 'Word Problem',
          difficulty: formData.difficulty || 'Medium'
        }
      ]
    });
  };

  const updateGroup = (id: string, field: keyof QuestionGroup, value: string | number) => {
    persistDraft({
      ...formData,
      questionGroups: formData.questionGroups.map(g => g.id === id ? { ...g, [field]: value } : g)
    });
  };

  const removeGroup = (id: string) => {
    persistDraft({
      ...formData,
      questionGroups: formData.questionGroups.filter(g => g.id !== id)
    });
  };

  const totalQuestions = formData.questionGroups.reduce((sum, g) => sum + g.count, 0);
  const selectedFormats = Array.from(new Set(formData.questionGroups.map(g => g.format)));
  const selectedDifficulties = Array.from(new Set(formData.questionGroups.map(g => g.difficulty)));

  const goNext = () => {
    if (step === 1 && (!formData.setName?.trim() || !formData.mainTopic || !formData.subtopic || !activePrepLevel)) return;
    setStep((s) => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrevious = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveAsDefault = () => {
    const { outputIncludes, displayOptions } = formData;
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify({ outputIncludes, displayOptions }));
    setSavedDefaultsNotice(true);
    setTimeout(() => setSavedDefaultsNotice(false), 2200);
  };

  const fullTopicString = formData.mainTopic && formData.subtopic
    ? `${formData.mainTopic}: ${formData.subtopic}`
    : 'None';

  const promptPreview = [
    `Set Name: ${formData.setName || 'Untitled'}`,
    `Grade: ${activePrepLevel}`,
    `Topic: ${fullTopicString}`,
    `Formats: ${selectedFormats.join(', ') || 'None'}`,
    `Difficulties: ${selectedDifficulties.join(', ') || 'None'}`,
    `Scaffolding: ${formData.scaffolding.join(', ') || 'None'}`,
    formData.customRules ? `Rules: ${formData.customRules}` : null,
    `Total questions: ${totalQuestions}`,
    `Output includes: ${formData.outputIncludes.join(', ') || 'None'}`,
  ].filter(Boolean).join('\n');

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const generatedSet = await generateSet({
        setName: formData.setName,
        topic: fullTopicString,
        difficulty: formData.difficulty,
        prepLevel: activePrepLevel,
        formData: formData
      });

      const formattedSet = {
        ...generatedSet,
        name: formData.setName,
        prepLevel: generatedSet.prep_level || activePrepLevel,
        formData: formData,
        questions: generatedSet.questions.map((q: GeneratedQuestion) => ({
          ...q,
          difficulty: q.difficulty || formData.difficulty,
          prepLevel: q.prepLevel || activePrepLevel,
          topic: q.topic || formData.mainTopic,
          subtopic: q.subtopic || formData.subtopic,
        })),
      };

      localStorage.setItem(LAST_SET_KEY, JSON.stringify(formattedSet));
      localStorage.removeItem(DRAFT_KEY);

      navigate('/results');
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setLoading(false);
    }
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
          <FeedbackButton
            context={{
              section: `generator-step-${step}`,
              metadata: { setName: formData.setName, prepLevel: activePrepLevel },
            }}
          />
          <ProfileButton />
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
                'Start with the learning goal, context, and custom rules.',
                'Adjust the types of questions, difficulty, and scaffolding.',
                'Decide what shows up in the final output and save it as your default.',
                'Check your choices, then generate the set.',
              ][step - 1]}</p>
            </div>

            {step === 1 && (
              <div className={styles.formGrid}>
                <label className={`${styles.field} ${styles.full}`}>
                  <span>Set Name *</span>
                  <input
                    value={formData.setName || ''}
                    onChange={(e) => persistDraft({ ...formData, setName: e.target.value })}
                    placeholder="e.g., Pop Quiz: Hockey & Interest Rates"
                  />
                </label>

                <div className={`${styles.field} ${styles.full}`}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Curriculum Alignment *
                    <InfoTooltip text="Select the grade level, main topic, and subtopic so the AI generates problems that align with the correct curriculum content." />
                  </span>
                  <div className={styles.curriculumRow}>
                    <select
                      className={`${styles.select} ${styles.prepLevelSelect}`}
                      value={activePrepLevel}
                      onChange={(e) => {
                        setActivePrepLevel(e.target.value as PrepLevel);
                        persistDraft({ ...formData, mainTopic: '', subtopic: '' });
                      }}
                    >
                      {PREP_LEVELS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    <select
                      className={`${styles.select} ${styles.topicSelect}`}
                      value={formData.mainTopic || ''}
                      onChange={(e) => persistDraft({ ...formData, mainTopic: e.target.value, subtopic: '' })}
                      disabled={!CURRICULUM_DATA[activePrepLevel]}
                    >
                      <option value="" disabled>
                        {CURRICULUM_DATA[activePrepLevel] ? "Select topic..." : "No data for this grade"}
                      </option>
                      {CURRICULUM_DATA[activePrepLevel] && Object.keys(CURRICULUM_DATA[activePrepLevel]).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>

                    <select
                      className={`${styles.select} ${styles.subtopicSelect}`}
                      value={formData.subtopic || ''}
                      onChange={(e) => persistDraft({ ...formData, subtopic: e.target.value })}
                      disabled={!formData.mainTopic || !CURRICULUM_DATA[activePrepLevel]}
                    >
                      <option value="" disabled>Select subtopic...</option>
                      {formData.mainTopic && CURRICULUM_DATA[activePrepLevel]?.[formData.mainTopic]?.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className={styles.field}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Real-world context <em>Optional</em>
                    <InfoTooltip text="Add a theme relevant to your students, such as sports, music, or local events, to make the problems more engaging and relatable." />
                  </span>
                  <input
                    value={formData.realWorldContext}
                    onChange={(e) => persistDraft({ ...formData, realWorldContext: e.target.value })}
                    placeholder="e.g., sports, music, local community"
                  />
                </label>

                <label className={`${styles.field} ${styles.full}`}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Custom rules <em>Optional</em>
                    <InfoTooltip text="Specify any additional constraints the AI should follow when generating problems, such as using whole numbers only or avoiding negative answers." />
                  </span>
                  <textarea
                    rows={2}
                    value={formData.customRules}
                    onChange={(e) => persistDraft({ ...formData, customRules: e.target.value })}
                    placeholder="e.g., Use whole numbers only, avoid negative answers"
                  />
                </label>
              </div>
            )}

            {step === 2 && (
              <div className={styles.formGrid}>
                <div className={`${styles.field} ${styles.full}`}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Problem configuration *
                    <InfoTooltip text="Define your set using one or more types. Each type specifies the number of questions, their format, and their difficulty level. Add another type to include multiple question types." />
                  </span>
                  <div className={styles.countList}>
                    {formData.questionGroups.map((group) => (
                      <div key={group.id} className={styles.groupRow}>
                        <div className={`${styles.counter} ${styles.groupCounter}`}>
                          <button
                            type="button"
                            onClick={() => updateGroup(group.id, 'count', Math.max(1, group.count - 1))}
                            disabled={group.count <= 1}
                          >−</button>
                          <span className={styles.counterValue}>{group.count}</span>
                          <button
                            type="button"
                            onClick={() => updateGroup(group.id, 'count', Math.min(30, group.count + 1))}
                            disabled={group.count >= 30}
                          >+</button>
                        </div>

                        <select
                          className={`${styles.select} ${styles.groupFormatSelect}`}
                          value={group.format}
                          onChange={(e) => updateGroup(group.id, 'format', e.target.value)}
                        >
                          {PROBLEM_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>

                        <span className={styles.groupAtLabel}>at</span>

                        <select
                          className={`${styles.select} ${styles.groupDifficultySelect}`}
                          value={group.difficulty}
                          onChange={(e) => updateGroup(group.id, 'difficulty', e.target.value)}
                        >
                          {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.value}</option>)}
                        </select>

                        {formData.questionGroups.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeGroup(group.id)}
                            className={styles.removeGroupButton}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addGroup}
                      className={`${styles.secondaryButton} ${styles.addGroupButton}`}
                    >
                      + Add another type
                    </button>
                  </div>
                  <p className={styles.totalLine}>Total questions: <strong>{totalQuestions}</strong></p>
                </div>

                <div className={`${styles.field} ${styles.full}`}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Scaffolding level <em>Select all that apply</em>
                    <InfoTooltip text="Indicate how much support students should receive while solving each problem, ranging from full independence to fully guided, step by step assistance." />
                  </span>
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
              </div>
            )}

            {step === 3 && (
              <div className={styles.outputLayout}>
                <div className={styles.outputColumn}>
                  <div className={styles.field}>
                    <span className={styles.sectionLabelTeal}>
                      Student Worksheet <span className={styles.sectionLabelNote}>(What students see)</span>
                      <InfoTooltip text="These settings determine what appears on the version students receive, including instructions, hints, and how much space is provided for their work." />
                    </span>
                    <div className={styles.checkGrid}>
                      {['Instructions', 'Hints', 'Scratch space'].map((o) => (
                        <label key={o} className={styles.checkCard}>
                          <input
                            type="checkbox"
                            checked={formData.outputIncludes.includes(o as OutputInclude)}
                            onChange={() => persistDraft({ ...formData, outputIncludes: toggleInArray(formData.outputIncludes, o as OutputInclude) })}
                          />
                          <span className={styles.checkBox}>✓</span>
                          <span>{o}</span>
                        </label>
                      ))}
                      {['Answer space', 'Extra room for solution', 'Graph / diagram space', 'Difficulty tag'].map((d) => (
                        <label key={d} className={styles.checkCard}>
                          <input
                            type="checkbox"
                            checked={formData.displayOptions.includes(d as DisplayOption)}
                            onChange={() => persistDraft({ ...formData, displayOptions: toggleInArray(formData.displayOptions, d as DisplayOption) })}
                          />
                          <span className={styles.checkBox}>✓</span>
                          <span>{d}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.field}>
                    <span className={styles.sectionLabelViolet}>
                      Teacher Key <span className={styles.sectionLabelNote}>(What you see)</span>
                      <InfoTooltip text="These settings apply only to your copy and are not shown to students. They include the final answers and, if selected, the complete worked out solutions." />
                    </span>
                    <div className={styles.checkGrid}>
                      {['Answer key', 'Worked solutions'].map((o) => (
                        <label key={o} className={styles.checkCard}>
                          <input
                            type="checkbox"
                            checked={formData.outputIncludes.includes(o as OutputInclude)}
                            onChange={() => persistDraft({ ...formData, outputIncludes: toggleInArray(formData.outputIncludes, o as OutputInclude) })}
                          />
                          <span className={styles.checkBox}>✓</span>
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={`${styles.field} ${styles.saveDefaultRow} ${styles.saveDefaultRowTop}`}>
                    <button type="button" className={styles.secondaryButton} onClick={handleSaveAsDefault}>
                      Save as default
                    </button>
                    {savedDefaultsNotice && <span className={styles.savedNotice}>Saved to your profile defaults ✓</span>}
                  </div>
                </div>

                <div className={styles.previewPane}>
                  <span className={styles.previewPaneLabel}>Preview</span>

                  <div className={styles.previewCard}>

                    {formData.outputIncludes.includes('Instructions') && (
                      <div className={styles.previewInstructions}>
                        Instructions: Solve the following problem showing all your work.
                      </div>
                    )}

                    <div className={styles.previewQuestionRow}>
                      <strong>1. If a hockey team deposits $6,500 at 6.5% interest...</strong>
                      {formData.displayOptions.includes('Difficulty tag') && (
                        <span className={styles.previewDifficultyTag}>Medium</span>
                      )}
                    </div>

                    {formData.outputIncludes.includes('Hints') && (
                      <div className={styles.previewHint}>
                        Hint: Use the compound interest formula to start.
                      </div>
                    )}

                    {formData.displayOptions.includes('Graph / diagram space') && (
                      <div className={styles.previewGraphSpace} />
                    )}

                    {(formData.displayOptions.includes('Extra room for solution') || formData.outputIncludes.includes('Scratch space')) && (
                      <div className={styles.previewExtraSpace}>
                        {formData.outputIncludes.includes('Scratch space') ? 'Scratch Space provided' : 'Extra room for solution'}
                      </div>
                    )}

                    {formData.displayOptions.includes('Answer space') && (
                      <div className={styles.previewAnswerSpace}>
                        Answer: _________________
                      </div>
                    )}

                    {(formData.outputIncludes.includes('Answer key') || formData.outputIncludes.includes('Worked solutions')) && (
                      <div className={styles.previewTeacherKey}>
                        <span className={styles.previewTeacherKeyLabel}>Teacher Key Visible</span>

                        {formData.outputIncludes.includes('Worked solutions') && (
                          <div className={styles.previewWorkedSolution}>
                            A = 6500(1 + 0.065)³ <br /> A ≈ 7851.68
                          </div>
                        )}

                        {formData.outputIncludes.includes('Answer key') && (
                          <div className={styles.previewFinalAnswer}>Final: $7,851.68</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className={styles.review}>
                <div className={styles.reviewCallout}>
                  <span>✓</span>
                  <div>
                    <strong>Ready to create your problem set</strong>
                    <p>Review the details below, then create the problem set for {activePrepLevel}.</p>
                  </div>
                </div>
                <div className={styles.reviewGrid}>
                  <div>
                    <small>LEARNING GOAL</small>
                    <strong>{formData.setName || formData.mainTopic || 'Not specified'}</strong>
                    <p>{activePrepLevel} · {profile.subjects[0]}{formData.subtopic ? ` · ${formData.subtopic}` : ''}</p>
                  </div>
                  <div>
                    <small>CHALLENGE</small>
                    <strong>{selectedDifficulties.join(', ') || 'Medium'}</strong>
                    <p>{formData.scaffolding.join(', ')} support</p>
                  </div>
                  <div>
                    <small>DELIVERABLE</small>
                    <strong>{totalQuestions} questions</strong>
                    <p>{selectedFormats.join(', ') || 'No formats selected'}</p>
                  </div>
                  <div>
                    <small>OUTPUT</small>
                    <p>
                      <strong>Student:</strong>{' '}
                      {[...formData.outputIncludes.filter(o => ['Instructions', 'Hints', 'Scratch space'].includes(o)), ...formData.displayOptions].join(', ') || 'None'}
                    </p>
                    <p>
                      <strong>Teacher:</strong>{' '}
                      {formData.outputIncludes.filter(o => ['Answer key', 'Worked solutions'].includes(o)).join(', ') || 'None'}
                    </p>
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
                  disabled={step === 1 && (!formData.setName?.trim() || !formData.mainTopic || !formData.subtopic || !activePrepLevel)}
                >
                  Continue <span>→</span>
                </button>
              ) : (
                <button
                  className={`${styles.primaryButton} ${styles.generate}`}
                  onClick={handleGenerate}
                  disabled={loading || totalQuestions === 0 || !formData.setName?.trim()}
                >
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
                  <strong>{activePrepLevel}</strong>
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
      </div>
    </main>
  );
};

export default Generator;