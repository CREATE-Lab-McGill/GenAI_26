import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TagBadge from '../components/TagBadge';
import FeedbackButton from '../components/Feedback';
import ProfileButton from '../components/Profile';
import type {
  GeneratedQuestion,
  GeneratedSet,
  OutputInclude,
  DisplayOption,
} from '../types/problem';
import { editQuestionWithAi, editSetWithAi, saveSet, deleteQuestion, updateQuestionManual, generateAlternativeQuestion, exportWordDocument } from '../api/client';
import styles from '../styles/OutputPageStyles.module.css';
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "mathlive";
import { saveAs } from 'file-saver';

const LAST_SET_KEY = 'mathcraft_last_generated_set';

const STUDENT_INCLUDE_OPTIONS: OutputInclude[] = ['Instructions', 'Hints', 'Scratch space'];
const TEACHER_INCLUDE_OPTIONS: OutputInclude[] = ['Answer key', 'Worked solutions'];
const STUDENT_DISPLAY_OPTIONS: DisplayOption[] = [
  'Answer space',
  'Extra room for solution',
  'Graph / diagram space',
  'Difficulty tag',
];

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

type PrintMode = 'student' | 'teacher';

const ProblemOutput = (): React.ReactElement => {
  const navigate = useNavigate();
  const [set, setSet] = useState<GeneratedSet | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');

  const [showMathBuilder, setShowMathBuilder] = useState(false);
  const mathFieldRef = useRef<any>(null);

  const [aiEditingId, setAiEditingId] = useState<string | null>(null);
  const [aiPromptText, setAiPromptText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [savingMode, setSavingMode] = useState<'text' | 'resync' | null>(null);

  const [globalPrompt, setGlobalPrompt] = useState('');
  const [isGlobalEditing, setIsGlobalEditing] = useState(false);
  const [showEditSetModal, setShowEditSetModal] = useState(false);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [setName, setSetName] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [pendingDelete, setPendingDelete] = useState<GeneratedQuestion | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [printMode] = useState<PrintMode>('student');
  const [showSetMenu, setShowSetMenu] = useState(false);
  const setMenuRef = useRef<HTMLDivElement | null>(null);

  const [altLoadingId, setAltLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(LAST_SET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GeneratedSet;
      setSet(parsed);
      setQuestions(parsed.questions);
      setSetName(parsed.name || parsed.topic || '');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (setMenuRef.current && !setMenuRef.current.contains(e.target as Node)) {
        setShowSetMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const updateLocalStorage = (updatedSet: GeneratedSet) => {
    setSet(updatedSet);
    setQuestions(updatedSet.questions);
    localStorage.setItem(LAST_SET_KEY, JSON.stringify(updatedSet));
  };

  const toggleOutputInclude = (option: OutputInclude) => {
    const current = set!.formData?.outputIncludes || [];
    updateLocalStorage({
      ...set!,
      formData: { ...set!.formData, outputIncludes: toggleInArray(current, option) }
    });
  };

  const toggleDisplayOption = (option: DisplayOption) => {
    const current = set!.formData?.displayOptions || [];
    updateLocalStorage({
      ...set!,
      formData: { ...set!.formData, displayOptions: toggleInArray(current, option) }
    });
  };

  if (!set) {
    return (
      <main className={styles.outputPage}>
        <div className={styles.emptyShell}>
          <h1>No set to show yet</h1>
          <p>Generate a problem set first, then come back here to review it.</p>
          <button className={styles.primaryButton} onClick={() => navigate('/generate')}>Go to generator</button>
        </div>
      </main>
    );
  }

  const startEdit = (q: GeneratedQuestion) => {
    setAiEditingId(null);
    setEditingId(q.id);
    setDraftText(q.prompt);
    setShowMathBuilder(false);
  };

  const saveEdit = async (id: string, resyncAnswer: boolean) => {
    setSavingMode(resyncAnswer ? 'resync' : 'text');
    try {
      const updated = await updateQuestionManual(id, draftText, resyncAnswer);
      const updatedQuestions = questions.map((q) => (q.id === id ? { ...q, ...updated } : q));
      updateLocalStorage({ ...set, questions: updatedQuestions });
      setEditingId(null);
    } catch (error) {
      console.error("Failed to save manual edit:", error);
    } finally {
      setSavingMode(null);
    }
  };

  const startAiEdit = (q: GeneratedQuestion) => {
    setEditingId(null);
    setAiEditingId(q.id);
    setAiPromptText('');
  };

  const handleAiEdit = async (id: string) => {
    if (!aiPromptText.trim()) return;
    setIsAiLoading(true);
    try {
      const updatedQuestion = await editQuestionWithAi(id, aiPromptText);
      const updatedQuestions = questions.map((q) => (q.id === id ? { ...q, ...updatedQuestion } : q));
      updateLocalStorage({ ...set, questions: updatedQuestions });
      setAiEditingId(null);
    } catch (error) {
      console.error("Failed to edit question:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGlobalEdit = async () => {
    if (!globalPrompt.trim() || !set.id) return;
    setIsGlobalEditing(true);
    try {
      const updatedSet = await editSetWithAi(set.id, globalPrompt);
      updateLocalStorage({
        ...set,
        ...updatedSet,
        name: updatedSet.name || set.name
      });

      setGlobalPrompt('');
      setShowEditSetModal(false);
    } catch (error) {
      console.error("Failed to edit set:", error);
    } finally {
      setIsGlobalEditing(false);
    }
  };

  const moreLikeThis = async (q: GeneratedQuestion) => {
    setAltLoadingId(q.id);
    try {
      const updatedQuestion = await generateAlternativeQuestion(q.id);
      const updatedQuestions = questions.map((item) => (item.id === q.id ? { ...item, ...updatedQuestion } : item));
      updateLocalStorage({ ...set, questions: updatedQuestions });
    } catch (error) {
      console.error("Failed to generate alternative question:", error);
    } finally {
      setAltLoadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const updatedQuestions = questions.filter((q) => q.id !== pendingDelete.id);
    updateLocalStorage({ ...set, questions: updatedQuestions });
    const idToDelete = pendingDelete.id;
    setPendingDelete(null);
    try {
      await deleteQuestion(idToDelete);
    } catch (error) {
      console.error("Failed to delete question:", error);
    }
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragEnter = (index: number) => {
    if (dragIndex === null || index === dragOverIndex) return;
    setDragOverIndex(index);
  };
  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const copy = [...questions];
    const [moved] = copy.splice(dragIndex, 1);
    copy.splice(targetIndex, 0, moved);
    updateLocalStorage({ ...set, questions: copy });
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleSaveSet = async () => {
    try {
      if (setName.trim() && setName !== set.name) {
        updateLocalStorage({ ...set, name: setName.trim() });
      }
      await saveSet(set.id);
      setShowSaveModal(false);
      setSaveNotice('Saved to your sets ✓');
      setTimeout(() => setSaveNotice(''), 2200);
    } catch (error) {
      console.error("Failed to save set:", error);
    }
  };

  const handleExportWord = async (mode: PrintMode) => {
    try {
      const blob = await exportWordDocument({
        name: set!.name || set!.topic || 'Untitled set',
        questions: questions,
        mode: mode
      });

      saveAs(blob, `${set!.name || 'problem-set'}-${mode}.docx`);

    } catch (error) {
      console.error("Error al exportar:", error);
      alert("There was a problem generating the Word file. Please try again.");
    }
  };

  const displayOptions = set.formData?.displayOptions || [];
  const outputIncludes = set.formData?.outputIncludes || [];

  return (
    <main
      className={`${styles.outputPage} ${printMode === 'student' ? styles.printAsStudent : styles.printAsTeacher}`}
    >
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="MathCraft home">
          <span className={styles.brandMark}>M</span>
          <span>MathCraft</span>
        </a>
        <ProfileButton />
      </header>

      <div className={styles.shell}>
        <section className={styles.setHeader}>
          <div>
            <span className={styles.eyebrow}>Generated set</span>
            <h1>{set.name || set.topic || 'Untitled set'}</h1>
            <p>{questions.length} questions · {set.prepLevel}</p>
          </div>
          <div className={styles.setActions}>
            <FeedbackButton
              context={{
                section: 'output-review',
                metadata: { setId: set.id, questionCount: questions.length },
              }}
            />
            <div className={styles.setOptionsWrap} ref={setMenuRef}>
              <button
                className={styles.secondaryButton}
                onClick={() => setShowSetMenu(!showSetMenu)}
              >
                Options ▾
              </button>

              {showSetMenu && (
                <div className={styles.setOptionsDropdown}>
                  <button className={styles.menuItem} onClick={() => { setShowEditSetModal(true); setShowSetMenu(false); }}>
                    Edit set
                  </button>
                  <button className={styles.menuItem} onClick={() => { setShowSettingsModal(true); setShowSetMenu(false); }}>
                    Output settings
                  </button>
                  <div className={styles.menuDivider} />
                  <button className={styles.menuItem} onClick={() => { handleExportWord('student'); setShowSetMenu(false); }}>
                    Export student sheet (Word)
                  </button>
                  <button className={styles.menuItem} onClick={() => { handleExportWord('teacher'); setShowSetMenu(false); }}>
                    Export answer key (Word)
                  </button>
                </div>
              )}
            </div>

            <button className={styles.primaryButton} onClick={() => setShowSaveModal(true)}>
              Save set
            </button>
          </div>
        </section>

        {saveNotice && <p className={styles.saveNotice}>{saveNotice}</p>}

        {outputIncludes.includes('Instructions') && (
          <div className={styles.setInstructions}>
            Instructions: Solve the following problems showing all your work.
          </div>
        )}

        <div className={styles.printHeader}>
          <h1>{set.name || set.topic || 'Untitled set'}</h1>
          <p>
            {set.prepLevel} · {questions.length} questions
            {printMode === 'teacher' && <span className={styles.printKeyTag}> · Answer key</span>}
          </p>
        </div>

        <ul className={styles.questionList}>
          {questions.map((q, index) => (
            <li
              key={q.id}
              className={`${styles.questionCard} ${dragIndex === index ? styles.dragging : ''} ${dragOverIndex === index && dragIndex !== index ? styles.dropTarget : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
            >
              <div className={styles.dragHandle} aria-hidden="true">⠿</div>

              <div className={styles.questionMain}>
                <div className={styles.questionTop}>
                  <span className={styles.questionIndex}>Question {index + 1}</span>
                </div>

                {editingId === q.id ? (
                  <div className={styles.editArea}>

                    <button
                      className={styles.builderToggleBtn}
                      onClick={() => setShowMathBuilder(!showMathBuilder)}
                    >
                      {showMathBuilder ? 'Close equation editor' : 'Open equation editor'}
                    </button>

                    {showMathBuilder && (
                      <div className={styles.mathBuilderContainer}>
                        <span className={styles.builderHint}>Build your equation below and insert it into the text.</span>
                        <div className={styles.mathBuilderRow}>
                          {/* @ts-ignore */}
                          <math-field
                            ref={mathFieldRef}
                            className={styles.mathFieldElement}
                          />
                          <button
                            className={styles.insertBtn}
                            onClick={() => {
                              if (mathFieldRef.current && mathFieldRef.current.value) {
                                const latex = mathFieldRef.current.value;
                                setDraftText((prev) => prev + ` $${latex}$ `);
                                mathFieldRef.current.value = '';
                              }
                            }}
                          >
                            Insert
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={styles.splitEditor}>
                      <textarea
                        className={styles.splitTextarea}
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        placeholder="Write your question here..."
                      />
                      <div className={styles.livePreviewBox}>
                        <span className={styles.previewLabel}>Preview</span>
                        <div className={styles.questionPrompt}>
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {draftText || '*Start typing to see preview...*'}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>

                    <div className={styles.editActions}>
                      <button className={styles.secondaryButton} onClick={() => setEditingId(null)} disabled={!!savingMode}>
                        Cancel
                      </button>
                      <button className={styles.secondaryButton} onClick={() => saveEdit(q.id, false)} disabled={!!savingMode}>
                        {savingMode === 'text' ? 'Saving...' : 'Save text only'}
                      </button>
                      <button className={styles.primaryButton} onClick={() => saveEdit(q.id, true)} disabled={!!savingMode}>
                        {savingMode === 'resync' ? 'Updating...' : 'Save & update'}
                      </button>
                    </div>
                  </div>
                ) : aiEditingId === q.id ? (
                  <div className={styles.editArea}>
                    <div className={styles.aiEditPreview}>
                      <span className={styles.previewLabel}>Original</span>
                      <div className={styles.questionPrompt}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {q.prompt}
                        </ReactMarkdown>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      placeholder="What should the AI change? (e.g., 'Make it multiple choice', 'Change context to soccer')"
                      value={aiPromptText}
                      onChange={(e) => setAiPromptText(e.target.value)}
                    />
                    <div className={styles.editActions}>
                      <button className={styles.secondaryButton} onClick={() => setAiEditingId(null)} disabled={isAiLoading}>Cancel</button>
                      <button className={styles.primaryButton} onClick={() => handleAiEdit(q.id)} disabled={isAiLoading || !aiPromptText.trim()}>
                        {isAiLoading ? 'Generating...' : 'Generate Update'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.questionContent}>
                    <div className={styles.questionPrompt}>
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {q.prompt}
                      </ReactMarkdown>
                    </div>

                    {outputIncludes.includes('Hints') && q.hint && (
                      <div className={styles.hintBox}>
                        <strong>Hint:</strong> <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.hint}</ReactMarkdown>
                      </div>
                    )}

                    {displayOptions.includes('Graph / diagram space') && (
                      <div className={styles.graphSpace} />
                    )}

                    {(displayOptions.includes('Extra room for solution') || outputIncludes.includes('Scratch space')) && (
                      <div className={styles.scratchSpace}>
                        {outputIncludes.includes('Scratch space') ? 'Scratch Space' : 'Solution Space'}
                      </div>
                    )}

                    {displayOptions.includes('Answer space') && (
                      <div className={styles.answerLine}>
                        Answer: _________________________________________________
                      </div>
                    )}

                    {(outputIncludes.includes('Answer key') || outputIncludes.includes('Worked solutions')) && (
                      <div className={styles.teacherKeyBlock}>
                        <span className={styles.teacherKeyLabel}>Teacher Key Visible</span>

                        {outputIncludes.includes('Worked solutions') && q.solution && (
                          <div className={styles.workedSolution}>
                            <strong>Solution Steps:</strong>
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {q.solution}
                            </ReactMarkdown>
                          </div>
                        )}

                        {outputIncludes.includes('Answer key') && q.answer && (
                          <div className={styles.finalAnswer}>
                            <span>Final Answer:</span>
                            <span>
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {q.answer}
                              </ReactMarkdown>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.tagRow}>
                  {q.topic && <TagBadge kind="topic" label={q.topic} />}
                  {q.subtopic && <TagBadge kind="subtopic" label={q.subtopic} />}
                  {(q.prepLevel || set.prepLevel) && (
                    <TagBadge kind="prep" label={q.prepLevel || set.prepLevel} />
                  )}
                  {(displayOptions.includes('Difficulty tag') || displayOptions.length === 0) && q.difficulty && (
                    <TagBadge kind="difficulty" label={q.difficulty} />
                  )}
                </div>
              </div>

              <div className={styles.questionSidebar}>
                <button className={`${styles.sidebarControl} ${styles.aiBtn}`} onClick={() => startAiEdit(q)}>
                  ✦ Edit problem (AI)
                </button>
                <button className={styles.sidebarControl} onClick={() => startEdit(q)}>
                  Edit text
                </button>
                <button
                  className={styles.sidebarControl}
                  onClick={() => moreLikeThis(q)}
                  disabled={altLoadingId === q.id}
                >
                  {altLoadingId === q.id ? 'Generating...' : 'Alternative'}
                </button>
                <button className={`${styles.sidebarControl} ${styles.deleteBtn}`} onClick={() => setPendingDelete(q)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showEditSetModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditSetModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Edit Set</h3>
            <p className={styles.modalBody}>
              Describe what you want to change globally (e.g., "Make all problems about hockey").
            </p>
            <textarea
              className={styles.modalTextarea}
              rows={3}
              placeholder="Type your AI instructions here..."
              value={globalPrompt}
              onChange={(e) => setGlobalPrompt(e.target.value)}
              disabled={isGlobalEditing}
            />
            <div className={styles.modalActions} style={{ alignItems: 'center' }}>
              <div style={{ flex: 1 }}></div>
              <button className={styles.secondaryButton} onClick={() => setShowEditSetModal(false)}>Cancel</button>
              <button className={styles.primaryButton} onClick={handleGlobalEdit} disabled={!globalPrompt.trim() || isGlobalEditing}>
                {isGlobalEditing ? 'Updating...' : 'Update set'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Edit output settings</h3>
            <p className={styles.modalBody}>
              Toggle what appears on the student worksheet and teacher key. Changes apply instantly.
            </p>

            <div className={styles.settingsGroup}>
              <span className={styles.sectionLabelTeal}>
                Student Worksheet <span className={styles.sectionLabelNote}>(What students see)</span>
              </span>
              <div className={styles.checkGrid}>
                {STUDENT_INCLUDE_OPTIONS.map((o) => (
                  <label key={o} className={styles.checkCard}>
                    <input
                      type="checkbox"
                      checked={outputIncludes.includes(o)}
                      onChange={() => toggleOutputInclude(o)}
                    />
                    <span className={styles.checkBox}>✓</span>
                    <span>{o}</span>
                  </label>
                ))}
                {STUDENT_DISPLAY_OPTIONS.map((d) => (
                  <label key={d} className={styles.checkCard}>
                    <input
                      type="checkbox"
                      checked={displayOptions.includes(d)}
                      onChange={() => toggleDisplayOption(d)}
                    />
                    <span className={styles.checkBox}>✓</span>
                    <span>{d}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={`${styles.settingsGroup} ${styles.settingsGroupTeacher}`}>
              <span className={styles.sectionLabelViolet}>
                Teacher Key <span className={styles.sectionLabelNote}>(What you see)</span>
              </span>
              <div className={styles.checkGrid}>
                {TEACHER_INCLUDE_OPTIONS.map((o) => (
                  <label key={o} className={styles.checkCard}>
                    <input
                      type="checkbox"
                      checked={outputIncludes.includes(o)}
                      onChange={() => toggleOutputInclude(o)}
                    />
                    <span className={styles.checkBox}>✓</span>
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.primaryButton} onClick={() => setShowSettingsModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Ready to save!</h3>
            <p className={styles.modalBody}>
              Confirm the name for this set before saving it to your profile.
            </p>
            <input
              className={styles.modalTextarea}
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder="Set name"
            />
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button className={styles.primaryButton} onClick={handleSaveSet} disabled={!setName.trim()}>Confirm Save</button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className={styles.modalOverlay} onClick={() => setPendingDelete(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Delete this question?</h3>
            <p className={styles.modalBody}>
              "{pendingDelete.prompt.length > 90 ? `${pendingDelete.prompt.slice(0, 90)}…` : pendingDelete.prompt}"
              will be removed from this set. This can't be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} onClick={() => setPendingDelete(null)}>Cancel</button>
              <button className={styles.dangerButton} onClick={confirmDelete}>Delete question</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ProblemOutput;