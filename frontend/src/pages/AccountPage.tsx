import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_PROFILE } from '../services/mockData';
import type { GeneratedSet } from '../types/problem';
import { getSets, deleteSet } from '../api/client';
import styles from '../styles/AccountPageStyles.module.css';
import FeedbackButton from '../components/Feedback';

const LAST_SET_KEY = 'mathcraft_last_generated_set';
const DEFAULTS_KEY = 'mathcraft_generator_defaults';

type Tab = 'history' | 'sets';

type MathLevel = 'Low' | 'Medium' | 'High';
type Pathway = 'CST' | 'TS' | 'SN';

interface PrepProfile {
  id: string;
  name: string;
  grade: string;
  curriculum: string;
  pathways: Pathway[];
  classSize: string;
  mathLevel: MathLevel;
  needs: string[];
}

const GRADES = ['Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 4', 'Secondary 5'];
const CURRICULA = ['Quebec (QEP)', 'Other'];
const PATHWAYS: { value: Pathway; label: string }[] = [
  { value: 'CST', label: 'CST (Culture, Société et Technique)' },
  { value: 'TS', label: 'TS (Technico-sciences)' },
  { value: 'SN', label: 'SN (Sciences naturelles)' },
];
const CLASS_SIZES = ['Under 15 students', '15–20 students', '20–25 students', '25–30 students', '30+ students'];
const MATH_LEVELS: MathLevel[] = ['Low', 'Medium', 'High'];
const NEEDS = ['Struggling learners', 'Advanced learners', 'Language learners', 'IEP / accommodations'];

const INITIAL_PREP_PROFILES: PrepProfile[] = [
  {
    id: 'sp1',
    name: 'Prep 1',
    grade: 'Secondary 4',
    curriculum: 'Quebec (QEP)',
    pathways: ['TS'],
    classSize: '25–30 students',
    mathLevel: 'Medium',
    needs: ['Struggling learners', 'Advanced learners', 'Language learners', 'IEP / accommodations'],
  },
  {
    id: 'sp2',
    name: 'Prep 2',
    grade: 'Secondary 4',
    curriculum: 'Quebec (QEP)',
    pathways: ['CST'],
    classSize: '25–30 students',
    mathLevel: 'Medium',
    needs: [],
  },
];

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const icons = {
  person: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c1.2-3.8 4-5.6 7-5.6s5.8 1.8 7 5.6" />
    </svg>
  ),
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M14 4v5h5" />
      <path d="M8 13h8M8 16.5h5" />
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M6 4h12v16l-6-4-6 4Z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
};

const Account = (): React.ReactElement => {
  const navigate = useNavigate();
  const profile = MOCK_PROFILE;

  const [sets, setSets] = useState<GeneratedSet[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [hasSavedDefaults, setHasSavedDefaults] = useState(false);

  const [prepProfiles, setPrepProfiles] = useState<PrepProfile[]>(INITIAL_PREP_PROFILES);
  const [activePrepProfileId, setActivePrepProfileId] = useState(INITIAL_PREP_PROFILES[0].id);

  useEffect(() => {
    setHasSavedDefaults(Boolean(localStorage.getItem(DEFAULTS_KEY)));

    getSets()
      .then((data: GeneratedSet[]) => setSets(data))
      .catch((error) => console.error('Failed to load sets:', error))
      .finally(() => setLoadingSets(false));
  }, []);

  const history = sets.slice(0, 20);
  const savedSets = sets.filter((s) => s.isSaved);

  const activePrepProfile = prepProfiles.find((p) => p.id === activePrepProfileId) ?? prepProfiles[0];

  const updateActivePrepProfile = (patch: Partial<PrepProfile>) => {
    setPrepProfiles((prev) => prev.map((p) => (p.id === activePrepProfile.id ? { ...p, ...patch } : p)));
  };

  const addPrepProfile = () => {
    const id = `sp_${Date.now()}`;
    const next: PrepProfile = {
      id,
      name: `Prep ${prepProfiles.length + 1}`,
      grade: GRADES[0],
      curriculum: CURRICULA[0],
      pathways: [],
      classSize: CLASS_SIZES[3],
      mathLevel: 'Medium',
      needs: [],
    };
    setPrepProfiles((prev) => [...prev, next]);
    setActivePrepProfileId(id);
  };

  const removePrepProfile = (id: string) => {
    if (prepProfiles.length <= 1) return;
    const next = prepProfiles.filter((p) => p.id !== id);
    setPrepProfiles(next);
    if (activePrepProfileId === id) setActivePrepProfileId(next[0].id);
  };

  const clearDefaults = () => {
    localStorage.removeItem(DEFAULTS_KEY);
    setHasSavedDefaults(false);
  };

  const openSet = (set: GeneratedSet) => {
    localStorage.setItem(LAST_SET_KEY, JSON.stringify(set));
    navigate('/results');
  };

  const handleDeleteSet = async (id: string) => {
    const previous = sets;
    setSets((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteSet(id);
    } catch (error) {
      console.error('Failed to delete set:', error);
      setSets(previous);
    }
  };

  const activeList = activeTab === 'history' ? history : savedSets;

  return (
    <main className={styles.accountPage}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="MathCraft home">
          <span className={styles.brandMark}>M</span>
          <span>MathCraft</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FeedbackButton />
          <button className={styles.backButton} onClick={() => navigate('/dashboard')}>
            <span aria-hidden="true">←</span> Back to dashboard
          </button>
        </div>
      </header>

      <div className={styles.shell}>

        <aside className={styles.sidebar}>

          <section className={styles.card}>
            <div className={styles.profileHeader}>
              <div className={styles.avatar}>{profile.name.split(' ').map((n) => n[0]).join('')}</div>
              <div>
                <h1>{profile.name}</h1>
                <p>{profile.email}</p>
                <p className={styles.schoolText}>{profile.school}</p>
              </div>
            </div>

            <div className={styles.presetBlock}>
              <span className={styles.fieldLabel}>Generation preset</span>
              {hasSavedDefaults ? (
                <div className={styles.defaultsRow}>
                  <span className={styles.defaultsBadge}>✓ Custom saved</span>
                  <button className={styles.textLink} onClick={clearDefaults}>Reset to standard</button>
                </div>
              ) : (
                <p className={styles.emptyLine}>No presets saved yet. Use "Save as default" in the generator.</p>
              )}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.statsGrid}>
              <div className={styles.statBlock}>
                <strong>{loadingSets ? '–' : history.length}</strong>
                <span>Sets created</span>
              </div>
              <div className={styles.statBlock}>
                <strong>{loadingSets ? '–' : savedSets.length}</strong>
                <span>Saved sets</span>
              </div>
            </div>
          </section>

        </aside>

        <div className={styles.mainContent}>

          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <span className={styles.cardIcon} aria-hidden="true">{icons.person}</span>
              <div>
                <h2>Prep profiles</h2>
                <p className={styles.cardSubtitle}>Fine-tune the generator for each specific class.</p>
              </div>
            </div>

            <div className={styles.profileTabs}>
              {prepProfiles.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  className={`${styles.profileTab} ${sp.id === activePrepProfile.id ? styles.profileTabActive : ''}`}
                  onClick={() => setActivePrepProfileId(sp.id)}
                >
                  {sp.name}
                  {prepProfiles.length > 1 && sp.id === activePrepProfile.id && (
                    <span
                      className={styles.profileTabRemove}
                      onClick={(e) => {
                        e.stopPropagation();
                        removePrepProfile(sp.id);
                      }}
                    >
                      ×
                    </span>
                  )}
                </button>
              ))}
              <button type="button" className={styles.addProfileButton} onClick={addPrepProfile}>
                <span aria-hidden="true">{icons.plus}</span> Add Prep
              </button>
            </div>

            <div className={styles.profileEditor}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Prep name</span>
                <input
                  value={activePrepProfile.name}
                  onChange={(e) => updateActivePrepProfile({ name: e.target.value })}
                />
              </label>

              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Grade</span>
                  <select
                    className={styles.select}
                    value={activePrepProfile.grade}
                    onChange={(e) => updateActivePrepProfile({ grade: e.target.value })}
                  >
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Curriculum</span>
                  <select
                    className={styles.select}
                    value={activePrepProfile.curriculum}
                    onChange={(e) => updateActivePrepProfile({ curriculum: e.target.value })}
                  >
                    {CURRICULA.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Pathway (Select all that apply)</span>
                <div className={styles.checkGrid}>
                  {PATHWAYS.map((p) => (
                    <label key={p.value} className={styles.checkCard}>
                      <input
                        type="checkbox"
                        checked={activePrepProfile.pathways.includes(p.value)}
                        onChange={() => updateActivePrepProfile({ pathways: toggleInArray(activePrepProfile.pathways, p.value) })}
                      />
                      <span className={styles.checkBox}>✓</span>
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <hr className={styles.divider} />

              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Class size</span>
                  <select
                    className={styles.select}
                    value={activePrepProfile.classSize}
                    onChange={(e) => updateActivePrepProfile({ classSize: e.target.value })}
                  >
                    {CLASS_SIZES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>

                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Math level</span>
                  <div className={styles.segmentRow}>
                    {MATH_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`${styles.segmentPill} ${activePrepProfile.mathLevel === level ? styles.segmentPillActive : ''}`}
                        onClick={() => updateActivePrepProfile({ mathLevel: level })}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Specific needs (Select all that apply)</span>
                <div className={styles.checkGrid}>
                  {NEEDS.map((need) => (
                    <label key={need} className={styles.checkCard}>
                      <input
                        type="checkbox"
                        checked={activePrepProfile.needs.includes(need)}
                        onChange={() => updateActivePrepProfile({ needs: toggleInArray(activePrepProfile.needs, need) })}
                      />
                      <span className={styles.checkBox}>✓</span>
                      <span>{need}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.tabsHeader}>
              <button className={`${styles.tabButton} ${activeTab === 'history' ? styles.tabActive : ''}`} onClick={() => setActiveTab('history')}>
                History ({history.length})
              </button>
              <button className={`${styles.tabButton} ${activeTab === 'sets' ? styles.tabActive : ''}`} onClick={() => setActiveTab('sets')}>
                Saved sets ({savedSets.length})
              </button>
            </div>

            {loadingSets ? (
              <p className={styles.emptyStateCenter}>Loading your sets…</p>
            ) : activeList.length === 0 ? (
              <p className={styles.emptyStateCenter}>
                {activeTab === 'history' ? 'No problems generated yet.' : 'No saved sets yet. Save one from the results page.'}
              </p>
            ) : (
              <div className={styles.listScroll}>
                <ul className={styles.list}>
                  {activeList.map((item) => (
                    <li key={item.id} className={styles.listItem}>
                      <span className={styles.listIcon} aria-hidden="true">{activeTab === 'sets' ? icons.bookmark : icons.document}</span>
                      <button className={styles.listItemMain} onClick={() => openSet(item)}>
                        <strong>{item.name || item.topic || 'Math problem'}</strong>
                        <span>
                          {activeTab === 'history'
                            ? `${new Date(item.createdAt).toLocaleDateString()} · ${item.prepLevel}`
                            : `${item.questions.length} questions · ${item.prepLevel}`}
                        </span>
                      </button>
                      <button
                        className={styles.deleteIcon}
                        onClick={() => handleDeleteSet(item.id)}
                        aria-label="Delete item"
                      >
                        {icons.trash}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  );
};

export default Account;