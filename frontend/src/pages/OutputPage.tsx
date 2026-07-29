import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TagBadge from '../components/TagBadge';
import { generateMockQuestion } from '../services/mockData';
import type { GeneratedQuestion, GeneratedSet, PrepLevel, ProblemFormat } from '../types/problem';
import { PROBLEM_FORMATS } from '../types/problem';
import styles from '../styles/OutputPageStyles.module.css';

const LAST_SET_KEY = 'mathcraft_last_generated_set';
const SAVED_SETS_KEY = 'mathcraft_saved_sets';

const ProblemOutput = (): React.ReactElement => {
  const navigate = useNavigate();
  const [set, setSet] = useState<GeneratedSet | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [setName, setSetName] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [pendingDelete, setPendingDelete] = useState<GeneratedQuestion | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(LAST_SET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GeneratedSet;
      setSet(parsed);
      setQuestions(parsed.questions);
    }
  }, []);

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
    setEditingId(q.id);
    setDraftText(q.prompt);
  };

  const saveEdit = (id: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, prompt: draftText } : q)));
    setEditingId(null);
  };

  const changeFormat = (id: string, format: ProblemFormat) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, format } : q)));
  };

  const moreLikeThis = (q: GeneratedQuestion) => {
    const replacement = generateMockQuestion(set.topic, q.format, q.difficultyTag, q.prepTag as PrepLevel, q.currTag);
    setQuestions((prev) => prev.map((item) => (item.id === q.id ? replacement : item)));
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setQuestions((prev) => prev.filter((q) => q.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  const shuffleOrder = () => {
    setQuestions((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

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
    setQuestions((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIndex, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleSaveSet = () => {
    if (!setName.trim()) return;
    const savedSets = JSON.parse(localStorage.getItem(SAVED_SETS_KEY) || '[]');
    const record = { ...set, questions, name: setName.trim(), savedAt: new Date().toISOString() };
    localStorage.setItem(SAVED_SETS_KEY, JSON.stringify([record, ...savedSets]));
    setShowSaveModal(false);
    setSaveNotice('Saved to your sets ✓');
    setTimeout(() => setSaveNotice(''), 2200);
  };

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <main className={styles.outputPage}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="MathCraft home">
          <span className={styles.brandMark}>M</span>
          <span>MathCraft</span>
        </a>
        <button className={styles.profileButton} onClick={() => navigate('/account')}>Profile</button>
      </header>

      <div className={styles.shell}>
        <section className={styles.setHeader}>
          <div>
            <span className={styles.eyebrow}>Generated set</span>
            <h1>{set.topic || 'Untitled set'}</h1>
            <p>{questions.length} questions · {set.prepLevel}</p>
          </div>
          <div className={styles.setActions}>
            <button className={styles.secondaryButton} onClick={shuffleOrder}>Shuffle order</button>
            <button className={styles.secondaryButton} onClick={handleExportPdf}>Export PDF</button>
            <button className={styles.primaryButton} onClick={() => setShowSaveModal(true)}>Save set</button>
          </div>
        </section>

        {saveNotice && <p className={styles.saveNotice}>{saveNotice}</p>}

        <div className={styles.printHeader}>
          <h1>{set.topic || 'Untitled set'}</h1>
          <p>{set.prepLevel} · {questions.length} questions</p>
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
                    <textarea rows={3} value={draftText} onChange={(e) => setDraftText(e.target.value)} />
                    <div className={styles.editActions}>
                      <button className={styles.secondaryButton} onClick={() => setEditingId(null)}>Cancel</button>
                      <button className={styles.primaryButton} onClick={() => saveEdit(q.id)}>Save changes</button>
                    </div>
                  </div>
                ) : (
                  <p className={styles.questionPrompt}>{q.prompt}</p>
                )}

                <div className={styles.tagRow}>
                  <TagBadge kind="curr" label={q.currTag} />
                  <TagBadge kind="prep" label={q.prepTag} />
                  <TagBadge kind="difficulty" label={q.difficultyTag} />
                </div>
              </div>

              <div className={styles.questionSidebar}>
                <select
                  className={styles.sidebarControl}
                  value={q.format}
                  onChange={(e) => changeFormat(q.id, e.target.value as ProblemFormat)}
                  title="Edit format"
                >
                  {PROBLEM_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <button className={styles.sidebarControl} onClick={() => startEdit(q)}>
                  Edit text
                </button>
                <button className={styles.sidebarControl} onClick={() => moreLikeThis(q)}>
                  More like this
                </button>
                <button className={`${styles.sidebarControl} ${styles.deleteBtn}`} onClick={() => setPendingDelete(q)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showSaveModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>Save this set</h3>
            <input
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder="e.g., Ratios — Tuesday warm-up"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSet()}
            />
            <div className={styles.modalActions}>
              <button className={styles.secondaryButton} onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button className={styles.primaryButton} onClick={handleSaveSet} disabled={!setName.trim()}>Save</button>
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