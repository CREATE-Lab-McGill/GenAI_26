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
import { editQuestionWithAi, editSetWithAi, saveSet, deleteQuestion, updateQuestionManual, generateAlternativeQuestion, exportWordDocument, reorderQuestions, duplicateSet, updateQuestionTip, updateQuestionOverrides, updateSetSettings } from '../api/client';
import styles from '../styles/OutputPageStyles.module.css';
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "mathlive";
import { saveAs } from 'file-saver';
import { GraphCanvas } from '../components/GraphCanvas';
import { toPng } from 'html-to-image';
import { DEFAULT_GRAPH_CONFIG, type GraphConfig } from '../types/problem';
import GraphSettingsEditor from '../components/GraphSettingsEditor';
import LogoBanner from '../components/LogoBanner';

const LAST_SET_KEY = 'mathcraft_last_generated_set';
const collapsedKey = (id: string) => `mathcraft_collapsed_${id}`;

const STUDENT_INCLUDE_OPTIONS: OutputInclude[] = ['Instructions', 'Hints'];
const TEACHER_INCLUDE_OPTIONS: OutputInclude[] = ['Answer key', 'Worked solutions', 'Teacher tip'];
const STUDENT_DISPLAY_OPTIONS: DisplayOption[] = [
  'Answer space',
  'Graph space',
  'Difficulty tag',
];

const QUESTION_INCLUDE_OPTIONS: OutputInclude[] = ['Hints'];
const QUESTION_DISPLAY_OPTIONS: DisplayOption[] = [
  'Answer space',
  'Graph space',
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [printMode] = useState<PrintMode>('student');
  const [showSetMenu, setShowSetMenu] = useState(false);
  const setMenuRef = useRef<HTMLDivElement | null>(null);

  const [altLoadingId, setAltLoadingId] = useState<string | null>(null);
  const [pendingAlternative, setPendingAlternative] = useState<GeneratedQuestion | null>(null);

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [showVersionBanner, setShowVersionBanner] = useState(true);

  const [settingsQuestionId, setSettingsQuestionId] = useState<string | null>(null);
  const questionSettingsRef = useRef<HTMLDivElement | null>(null);

  const [editingTipId, setEditingTipId] = useState<string | null>(null);
  const [tipDraft, setTipDraft] = useState('');
  const [savingTipId, setSavingTipId] = useState<string | null>(null);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [reorderMode, setReorderMode] = useState(false);
  const [showExpandNotice, setShowExpandNotice] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(LAST_SET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GeneratedSet;
      setSet(parsed);
      setQuestions(parsed.questions);
      setSetName(parsed.name || parsed.topic || '');

      try {
        const saved = localStorage.getItem(collapsedKey(parsed.id));
        if (saved) setCollapsedIds(new Set(JSON.parse(saved) as string[]));
      } catch {
      }
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (questionSettingsRef.current && !questionSettingsRef.current.contains(e.target as Node)) {
        setSettingsQuestionId(null);
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

  const persistSetSettings = (updatedSet: GeneratedSet) => {
    if (!updatedSet.id) return;
    updateSetSettings(updatedSet.id, updatedSet.formData).catch((e) =>
      console.error("Failed to save set settings:", e)
    );
  };

  const overridesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const persistQuestionOverrides = (updatedSet: GeneratedSet, questionId: string, debounce = false) => {
    const send = () => {
      const q = updatedSet.questions.find((x) => x.id === questionId);
      updateQuestionOverrides(questionId, q?.outputOverrides ?? null).catch((e) =>
        console.error("Failed to save question overrides:", e)
      );
    };
    if (!debounce) return send();
    clearTimeout(overridesTimers.current[questionId]);
    overridesTimers.current[questionId] = setTimeout(send, 500);
  };

  const toggleOutputInclude = (option: OutputInclude) => {
    const current = set!.formData?.outputIncludes || [];
    const updated = {
      ...set!,
      formData: { ...set!.formData, outputIncludes: toggleInArray(current, option) },
    };
    updateLocalStorage(updated);
    persistSetSettings(updated);
  };

  const toggleDisplayOption = (option: DisplayOption) => {
    const current = set!.formData?.displayOptions || [];
    const updated = {
      ...set!,
      formData: { ...set!.formData, displayOptions: toggleInArray(current, option) },
    };
    updateLocalStorage(updated);
    persistSetSettings(updated);
  };

  const getEffectiveIncludes = (q: GeneratedQuestion, setIncludes: OutputInclude[]): OutputInclude[] =>
    q.outputOverrides?.outputIncludes ?? setIncludes;

  const getEffectiveDisplay = (q: GeneratedQuestion, setDisplay: DisplayOption[]): DisplayOption[] =>
    q.outputOverrides?.displayOptions ?? setDisplay;

  const hasCustomSettings = (q: GeneratedQuestion): boolean =>
    !!q.outputOverrides?.outputIncludes || !!q.outputOverrides?.displayOptions ||
    !!q.outputOverrides?.graphConfig;

  const arraysEqualUnordered = <T,>(a: T[], b: T[]): boolean => {
    if (a.length !== b.length) return false;
    const setA = new Set(a);
    return b.every((v) => setA.has(v));
  };

  const toggleQuestionInclude = (q: GeneratedQuestion, option: OutputInclude, setIncludes: OutputInclude[]) => {
    if (!set) return;
    const base = q.outputOverrides?.outputIncludes ?? setIncludes;
    const updated = toggleInArray(base, option);
    const matchesGlobal = arraysEqualUnordered(updated, setIncludes);

    const updatedQuestions = questions.map((item) => {
      if (item.id !== q.id) return item;

      const newOverrides = { ...item.outputOverrides };
      if (matchesGlobal) {
        delete newOverrides.outputIncludes;
      } else {
        newOverrides.outputIncludes = updated;
      }

      const hasAnyOverride =
        !!newOverrides.outputIncludes || !!newOverrides.displayOptions || !!newOverrides.graphConfig;
      return { ...item, outputOverrides: hasAnyOverride ? newOverrides : undefined };
    });
    const newSet = { ...set, questions: updatedQuestions };
    updateLocalStorage(newSet);
    persistQuestionOverrides(newSet, q.id);
  };

  const updateGraphConfig = (q: GeneratedQuestion, newConfig: Partial<GraphConfig>) => {
    if (!set) return;

    const currentConfig = q.outputOverrides?.graphConfig
      ?? set.formData?.graphConfig
      ?? DEFAULT_GRAPH_CONFIG;
    const updatedConfig = { ...currentConfig, ...newConfig };

    const updatedQuestions = questions.map((item) =>
      item.id !== q.id
        ? item
        : { ...item, outputOverrides: { ...item.outputOverrides, graphConfig: updatedConfig } }
    );
    const newSet = { ...set, questions: updatedQuestions };
    updateLocalStorage(newSet);
    persistQuestionOverrides(newSet, q.id, true);
  };

  const updateGlobalGraphConfig = (newConfig: Partial<GraphConfig>) => {
    if (!set) return;

    const currentConfig = set.formData?.graphConfig ?? DEFAULT_GRAPH_CONFIG;
    const updatedConfig = { ...currentConfig, ...newConfig };

    const newSet = { ...set, formData: { ...set.formData, graphConfig: updatedConfig } };
    updateLocalStorage(newSet);
    persistSetSettings(newSet);
  };

  const toggleQuestionDisplay = (q: GeneratedQuestion, option: DisplayOption, setDisplay: DisplayOption[]) => {
    if (!set) return;
    const base = q.outputOverrides?.displayOptions ?? setDisplay;
    const updated = toggleInArray(base, option);
    const matchesGlobal = arraysEqualUnordered(updated, setDisplay);

    const updatedQuestions = questions.map((item) => {
      if (item.id !== q.id) return item;

      const newOverrides = { ...item.outputOverrides };
      if (matchesGlobal) {
        delete newOverrides.displayOptions;
      } else {
        newOverrides.displayOptions = updated;
      }

      const hasAnyOverride =
        !!newOverrides.outputIncludes || !!newOverrides.displayOptions || !!newOverrides.graphConfig;
      return { ...item, outputOverrides: hasAnyOverride ? newOverrides : undefined };
    });
    const newSet = { ...set, questions: updatedQuestions };
    updateLocalStorage(newSet);
    persistQuestionOverrides(newSet, q.id);
  };

  const resetQuestionOverrides = (q: GeneratedQuestion) => {
    if (!set) return;
    const updatedQuestions = questions.map((item) =>
      item.id === q.id ? { ...item, outputOverrides: undefined } : item
    );
    const newSet = { ...set, questions: updatedQuestions };
    updateLocalStorage(newSet);
    persistQuestionOverrides(newSet, q.id);
  };

  const startEditTip = (q: GeneratedQuestion) => {
    setEditingTipId(q.id);
    setTipDraft(q.teacherTip || '');
  };

  const cancelEditTip = () => {
    setEditingTipId(null);
    setTipDraft('');
  };

  const saveTip = async (q: GeneratedQuestion) => {
    if (!set) return;
    setSavingTipId(q.id);
    try {
      const updated = await updateQuestionTip(q.id, tipDraft);
      const updatedQuestions = questions.map((item) =>
        item.id === q.id ? { ...item, teacherTip: updated.teacherTip } : item
      );
      updateLocalStorage({ ...set, questions: updatedQuestions });
      setEditingTipId(null);
    } catch (error) {
      console.error("Failed to save teacher tip:", error);
    } finally {
      setSavingTipId(null);
    }
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

  const confirmAlternative = async () => {
    if (!pendingAlternative) return;
    const q = pendingAlternative;
    setAltLoadingId(q.id);
    try {
      const updatedQuestion = await generateAlternativeQuestion(q.id);
      const updatedQuestions = questions.map((item) => (item.id === q.id ? { ...item, ...updatedQuestion } : item));
      updateLocalStorage({ ...set, questions: updatedQuestions });
    } catch (error) {
      console.error("Failed to generate alternative question:", error);
    } finally {
      setAltLoadingId(null);
      setPendingAlternative(null);
    }
  };


  const confirmDelete = async () => {
    if (!pendingDelete || isDeleting) return;

    const idToDelete = pendingDelete.id;
    setIsDeleting(true);

    try {
      await deleteQuestion(idToDelete);

      const updatedQuestions = questions.filter(
        (q) => q.id !== idToDelete
      );

      updateLocalStorage({
        ...set!,
        questions: updatedQuestions,
      });

      setPendingDelete(null);
    } catch (error) {
      console.error("Failed to delete question:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const persistCollapsed = (next: Set<string>) => {
    setCollapsedIds(next);
    if (set?.id) {
      localStorage.setItem(collapsedKey(set.id), JSON.stringify(Array.from(next)));
    }
  };

  const toggleCollapse = (id: string) => {
    const next = new Set(collapsedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persistCollapsed(next);
  };

  const isQuestionCollapsed = (id: string) =>
    editingId !== id &&
    aiEditingId !== id &&
    (reorderMode || collapsedIds.has(id));

  const reorder = (from: number, to: number) => {
    if (from === to || to < 0 || to >= questions.length) return;
    const copy = [...questions];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    updateLocalStorage({ ...set, questions: copy });

    if (set.id) {
      reorderQuestions(set.id, copy.map((q) => q.id)).catch((error) => {
        console.error("Failed to save new order:", error);
      });
    }
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragEnter = (index: number) => {
    if (dragIndex === null || index === dragOverIndex) return;
    setDragOverIndex(index);
  };
  const handleDrop = (targetIndex: number) => {
    if (dragIndex !== null) reorder(dragIndex, targetIndex);
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

  const handleDuplicateSet = async () => {
    try {
      const newSet = await duplicateSet(set.id, duplicateName);
      updateLocalStorage({
        ...newSet,
        versionOf: set.name || set.topic || 'Untitled set',
      });
      setShowDuplicateModal(false);
      setDuplicateName('');
      setShowVersionBanner(true);
    } catch (error) {
      console.error("Failed to duplicate set:", error);
    }
  };

  const captureAllGraphs = async (): Promise<Record<string, string>> => {
    const images: Record<string, string> = {};
    for (const q of questions) {
      const effDisplay = getEffectiveDisplay(q, displayOptions);
      if (!effDisplay.includes('Graph space')) continue;

      const node = document.getElementById(`graph-${q.id}`);
      if (!node) continue;

      const rect = node.getBoundingClientRect();
      const originalWidth = node.style.width;
      node.style.width = `${rect.width}px`;

      try {
        images[q.id] = await toPng(node, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true
        });
      } catch (err) {
        console.error(`Error capturing graph ${q.id}:`, err);
      } finally {
        node.style.width = originalWidth;
      }
    }
    return images;
  };

  const handleExportWord = async (mode: PrintMode) => {
    try {
      const needsGraphs = questions.some((q) =>
        getEffectiveDisplay(q, displayOptions).includes('Graph space')
      );
      if (needsGraphs && (reorderMode || collapsedIds.size > 0)) {
        setReorderMode(false);
        persistCollapsed(new Set());
        setShowExpandNotice(true);
        return;
      }

      const graphImages = await captureAllGraphs();

      const blob = await exportWordDocument({
        name: set!.name || set!.topic || 'Untitled set',
        questions: questions,
        mode: mode,
        graphImages
      });

      saveAs(blob, `${set!.name || 'problem-set'}-${mode}.docx`);

    } catch (error) {
      console.error("Error exporting:", error);
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
        <LogoBanner />
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
                  <button className={styles.menuItem} onClick={() => { setShowDuplicateModal(true); setShowSetMenu(false); }}>
                    Create similar version
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

        {saveNotice && <p className={styles.saveNotice}>✓ {saveNotice}</p>}
        {set.versionOf && showVersionBanner && (
          <div className={styles.versionBanner}>
            <div className={styles.versionBannerText}>
              <strong>You're working on a new version.</strong>
              <span>Created from "{set.versionOf}" , the original set won't be affected by changes made here.</span>
            </div>
            <button
              className={styles.versionBannerClose}
              onClick={() => setShowVersionBanner(false)}
              aria-label="Close banner"
            >
              ×
            </button>
          </div>
        )}

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
          {questions.map((q, index) => {
            const effIncludes = getEffectiveIncludes(q, outputIncludes);
            const effDisplay = getEffectiveDisplay(q, displayOptions);
            const isCustom = hasCustomSettings(q);
            const collapsed = isQuestionCollapsed(q.id);

            return (
              <li
                key={q.id}
                className={`${styles.questionCard} ${collapsed ? styles.collapsed : ''} ${dragIndex === index ? styles.dragging : ''} ${dragOverIndex === index && dragIndex !== index ? styles.dropTarget : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
              >
                <div className={styles.dragHandle} aria-hidden="true">⠿</div>

                <div className={styles.questionMain}>
                  <div
                    className={`${styles.questionTop} ${reorderMode ? '' : styles.questionTopClickable}`}
                    onClick={() => {
                      if (!reorderMode) toggleCollapse(q.id);
                    }}
                  >
                    {!reorderMode && (
                      <button
                        type="button"
                        className={`${styles.collapseBtn} ${collapsed ? '' : styles.chevronOpen}`}
                        aria-label={collapsed ? 'Expand question' : 'Collapse question'}
                        aria-expanded={!collapsed}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 1.5 7 5 3 8.5" />
                        </svg>
                      </button>
                    )}
                    <span className={styles.questionIndex}>Question {index + 1}</span>
                    {collapsed && (
                      <div className={styles.collapsedPreview}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {q.prompt}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {!collapsed && (
                    <>
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
                                      const insertion = ` $${latex}$ `;
                                      const textarea = textareaRef.current;

                                      if (textarea) {
                                        const start = textarea.selectionStart ?? draftText.length;
                                        const end = textarea.selectionEnd ?? draftText.length;
                                        const newText = draftText.slice(0, start) + insertion + draftText.slice(end);
                                        setDraftText(newText);

                                        const cursorPos = start + insertion.length;
                                        requestAnimationFrame(() => {
                                          textarea.focus();
                                          textarea.setSelectionRange(cursorPos, cursorPos);
                                        });
                                      } else {
                                        setDraftText((prev) => prev + insertion);
                                      }

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
                              ref={textareaRef}
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

                          {effIncludes.includes('Hints') && q.hint && (
                            <div className={styles.hintBox}>
                              <strong>Hint:</strong> <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.hint}</ReactMarkdown>
                            </div>
                          )}


                          {effDisplay.includes('Graph space') && (
                            <GraphCanvas
                              id={`graph-${q.id}`}
                              config={q.outputOverrides?.graphConfig ?? set.formData?.graphConfig ?? DEFAULT_GRAPH_CONFIG}
                            />
                          )}

                          {effDisplay.includes('Answer space') && (
                            <div className={styles.answerLine}>
                              Answer: _________________________________________________
                            </div>
                          )}

                          {(effIncludes.includes('Answer key') ||
                            effIncludes.includes('Worked solutions') ||
                            effIncludes.includes('Teacher tip')) && (
                              <div className={styles.teacherKeyBlock}>
                                <span className={styles.teacherKeyLabel}>Teacher Key Visible</span>

                                {effIncludes.includes('Worked solutions') && q.solution && (
                                  <div className={styles.workedSolution}>
                                    <strong>Solution Steps:</strong>
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                      {q.solution}
                                    </ReactMarkdown>
                                  </div>
                                )}

                                {effIncludes.includes('Answer key') && q.answer && (
                                  <div className={styles.finalAnswer}>
                                    <span>Final Answer:</span>
                                    <span>
                                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                        {q.answer}
                                      </ReactMarkdown>
                                    </span>
                                  </div>
                                )}

                                {effIncludes.includes('Teacher tip') && (
                                  <div className={styles.teacherTipBox}>
                                    <div className={styles.teacherTipBoxHeader}>
                                      <span className={styles.teacherTipBoxLabel}>
                                        Teacher tip <span className={styles.teacherTipBoxNote}></span>
                                      </span>
                                      {editingTipId !== q.id && (
                                        <button
                                          type="button"
                                          className={styles.teacherTipEditIcon}
                                          onClick={() => startEditTip(q)}
                                          aria-label="Edit teacher tip"
                                        >
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>

                                    {editingTipId === q.id ? (
                                      <div className={styles.teacherTipEdit}>
                                        <textarea
                                          rows={2}
                                          value={tipDraft}
                                          onChange={(e) => setTipDraft(e.target.value)}
                                          autoFocus
                                          placeholder="Write a quick tip for this question..."
                                        />
                                        <div className={styles.teacherTipEditActions}>
                                          <button className={styles.secondaryButton} onClick={cancelEditTip} disabled={savingTipId === q.id}>
                                            Cancel
                                          </button>
                                          <button className={styles.primaryButton} onClick={() => saveTip(q)} disabled={savingTipId === q.id}>
                                            {savingTipId === q.id ? 'Saving...' : 'Save'}
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={styles.teacherTipBoxText} onClick={() => startEditTip(q)}>
                                        {q.teacherTip ? (
                                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                            {q.teacherTip}
                                          </ReactMarkdown>
                                        ) : (
                                          <em>No tip yet - click to write one</em>
                                        )}
                                      </div>
                                    )}
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
                        {(effDisplay.includes('Difficulty tag') || effDisplay.length === 0) && q.difficulty && (
                          <TagBadge kind="difficulty" label={q.difficulty} />
                        )}
                        {isCustom && (
                          <TagBadge
                            kind="custom"
                            label="Personalized"
                            onClear={() => resetQuestionOverrides(q)}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>

                {!collapsed && (
                  <div className={styles.questionSidebar}>

                    {settingsQuestionId === q.id && (
                      <div className={styles.sleekPopover} ref={questionSettingsRef}>
                        <div className={styles.sleekHeader}>
                          <h4>Format Settings</h4>
                          <button
                            className={styles.sleekClose}
                            onClick={() => setSettingsQuestionId(null)}
                            aria-label="Close"
                          >
                            ×
                          </button>
                        </div>

                        <div className={styles.sleekScrollArea}>
                          <span className={styles.sleekSectionTitle}>Worksheet</span>
                          <div className={styles.sleekToggleList}>
                            {QUESTION_INCLUDE_OPTIONS.map((o) => (
                              <label key={o} className={styles.sleekToggle}>
                                <input
                                  type="checkbox"
                                  checked={effIncludes.includes(o)}
                                  onChange={() => toggleQuestionInclude(q, o, outputIncludes)}
                                />
                                <span>{o}</span>
                              </label>
                            ))}
                            {QUESTION_DISPLAY_OPTIONS.map((d) => (
                              <label key={d} className={styles.sleekToggle}>
                                <input
                                  type="checkbox"
                                  checked={effDisplay.includes(d)}
                                  onChange={() => toggleQuestionDisplay(q, d, displayOptions)}
                                />
                                <span>{d}</span>
                              </label>
                            ))}
                          </div>

                          <span className={styles.sleekSectionTitle} style={{ color: 'var(--violet)' }}>
                            Teacher Key
                          </span>
                          <div className={styles.sleekToggleList}>
                            {TEACHER_INCLUDE_OPTIONS.map((o) => (
                              <label key={o} className={styles.sleekToggle}>
                                <input
                                  type="checkbox"
                                  checked={effIncludes.includes(o)}
                                  onChange={() => toggleQuestionInclude(q, o, outputIncludes)}
                                />
                                <span>{o}</span>
                              </label>
                            ))}
                          </div>

                          {effDisplay.includes('Graph space') && (
                            <div style={{ marginTop: '12px', paddingTop: '0px' }}>
                              <GraphSettingsEditor
                                currentConfig={q.outputOverrides?.graphConfig ?? set.formData?.graphConfig ?? DEFAULT_GRAPH_CONFIG}
                                onUpdate={(newConfig) => updateGraphConfig(q, newConfig)}
                              />
                            </div>
                          )}

                        </div>

                        <div className={styles.sleekFooter}>
                          <button
                            className={styles.sleekResetBtn}
                            onClick={() => resetQuestionOverrides(q)}
                            disabled={!isCustom}
                          >
                            Clear custom settings
                          </button>
                        </div>
                      </div>
                    )}

                    <button className={`${styles.sidebarControl} ${styles.aiBtn}`} onClick={() => startAiEdit(q)}>
                      ✦ Edit problem (AI)
                    </button>
                    <button
                      className={`${styles.sidebarControl} ${styles.questionSettingsBtn}`}
                      onClick={() => setSettingsQuestionId(settingsQuestionId === q.id ? null : q.id)}
                    >
                      Format Settings
                    </button>
                    <button className={styles.sidebarControl} onClick={() => startEdit(q)}>
                      Edit text
                    </button>
                    <button
                      className={styles.sidebarControl}
                      onClick={() => setPendingAlternative(q)}
                      disabled={altLoadingId === q.id}
                    >
                      {altLoadingId === q.id ? 'Generating...' : 'Alternative'}
                    </button>
                    <button className={`${styles.sidebarControl} ${styles.deleteBtn}`} onClick={() => setPendingDelete(q)}>
                      Delete
                    </button>
                  </div>
                )}
              </li>
            );
          })}
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

            {displayOptions.includes('Graph space') && (
              <div className={styles.settingsGroup} style={{ marginTop: '2px' }}>
                <div className={styles.compactGlobalGraph}>
                  <GraphSettingsEditor
                    currentConfig={set.formData?.graphConfig ?? DEFAULT_GRAPH_CONFIG}
                    onUpdate={(newConfig) => updateGlobalGraphConfig(newConfig)}
                  />
                </div>
              </div>
            )}

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
        <div
          className={styles.modalOverlay}
          onClick={() => {
            if (!isDeleting) setPendingDelete(null);
          }}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Delete this question?</h3>

            <p className={styles.modalBody}>
              This question will be removed from this set. This can't be undone.
            </p>

            <div className={styles.modalQuote}>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {pendingDelete.prompt}
              </ReactMarkdown>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>

              <button
                className={styles.dangerButton}
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete question'}
              </button>
            </div>
          </div>
        </div>
      )}


      {pendingAlternative && (
        <div
          className={styles.modalOverlay}
          onClick={() => !altLoadingId && setPendingAlternative(null)}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Generate an alternative?</h3>
            <p className={styles.modalBody}>
              A new version of this question will replace the current one.
            </p>
            <div className={styles.modalQuote}>
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {pendingAlternative.prompt}
              </ReactMarkdown>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setPendingAlternative(null)}
                disabled={!!altLoadingId}
              >
                Cancel
              </button>
              <button
                className={styles.primaryButton}
                onClick={confirmAlternative}
                disabled={!!altLoadingId}
              >
                {altLoadingId ? 'Generating...' : 'Generate alternative'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDuplicateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDuplicateModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Save as new version</h3>
            <p className={styles.modalBody}>
              Give this version a name. The original set stays untouched.
            </p>
            <input
              className={styles.modalTextarea}
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              placeholder="e.g., Harder version"
            />
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} onClick={() => setShowDuplicateModal(false)}>Cancel</button>
              <button className={styles.primaryButton} onClick={handleDuplicateSet} disabled={!duplicateName.trim()}>
                Duplicate
              </button>
            </div>
          </div>
        </div>
      )}

      {showExpandNotice && (
        <div className={styles.modalOverlay} onClick={() => setShowExpandNotice(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Questions expanded</h3>
            <p className={styles.modalBody}>
              All questions were expanded so the graphs can be included in the export.
              Press export again to download your file.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.primaryButton} onClick={() => setShowExpandNotice(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ProblemOutput;