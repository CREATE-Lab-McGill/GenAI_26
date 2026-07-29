import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_PROFILE } from '../services/mockData';
import type { GeneratedSet } from '../types/problem';
import styles from '../styles/AccountPageStyles.module.css';

const HISTORY_KEY = 'mathcraft_history';
const SAVED_SETS_KEY = 'mathcraft_saved_sets';
const DEFAULTS_KEY = 'mathcraft_generator_defaults';

type Tab = 'history' | 'sets';
type Language = 'English' | 'French';
const LANGUAGES: Language[] = ['English', 'French'];

type MathLevel = 'Low' | 'Medium' | 'High';
type Pathway = 'CST' | 'TS' | 'SN';

interface SubProfile {
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
const CURRICULA = ['Quebec (QEP)', 'Ontario Curriculum', 'IB Diploma', 'Other'];
const PATHWAYS: { value: Pathway; label: string }[] = [
  { value: 'CST', label: 'CST (Culture, Société et Technique)' },
  { value: 'TS', label: 'TS (Technico-sciences)' },
  { value: 'SN', label: 'SN (Sciences naturelles)' },
];
const CLASS_SIZES = ['Under 15 students', '15–20 students', '20–25 students', '25–30 students', '30+ students'];
const MATH_LEVELS: MathLevel[] = ['Low', 'Medium', 'High'];
const NEEDS = ['Struggling learners', 'Advanced learners', 'Language learners', 'IEP / accommodations'];

const INITIAL_SUB_PROFILES: SubProfile[] = [
  {
    id: 'sp1',
    name: 'Sub-profile 1',
    grade: 'Secondary 4',
    curriculum: 'Quebec (QEP)',
    pathways: ['TS'],
    classSize: '25–30 students',
    mathLevel: 'Medium',
    needs: ['Struggling learners', 'Advanced learners', 'Language learners', 'IEP / accommodations'],
  },
  {
    id: 'sp2',
    name: 'Sub-profile 2',
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
  graduationCap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="m3 9 9-4 9 4-9 4-9-4Z" />
      <path d="M7 11v4.5c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5V11" />
      <path d="M20 9v6" />
    </svg>
  ),
  sliders: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M5 7h14M5 12h14M5 17h14" />
      <circle cx="9" cy="7" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="10" cy="17" r="1.6" fill="currentColor" stroke="none" />
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
  )
};

const Account = (): React.ReactElement => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(MOCK_PROFILE);
  const [history, setHistory] = useState<GeneratedSet[]>([]);
  const [savedSets, setSavedSets] = useState<GeneratedSet[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [hasSavedDefaults, setHasSavedDefaults] = useState(false);

  const [subProfiles, setSubProfiles] = useState<SubProfile[]>(INITIAL_SUB_PROFILES);
  const [activeSubProfileId, setActiveSubProfileId] = useState(INITIAL_SUB_PROFILES[0].id);

  useEffect(() => {
    setHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'));
    setSavedSets(JSON.parse(localStorage.getItem(SAVED_SETS_KEY) || '[]'));
    setHasSavedDefaults(Boolean(localStorage.getItem(DEFAULTS_KEY)));
  }, []);

  const activeSubProfile = subProfiles.find((p) => p.id === activeSubProfileId) ?? subProfiles[0];

  const updateActiveSubProfile = (patch: Partial<SubProfile>) => {
    setSubProfiles((prev) => prev.map((p) => (p.id === activeSubProfile.id ? { ...p, ...patch } : p)));
  };

  const addSubProfile = () => {
    const id = `sp_${Date.now()}`;
    const next: SubProfile = {
      id,
      name: `Sub-profile ${subProfiles.length + 1}`,
      grade: GRADES[0],
      curriculum: CURRICULA[0],
      pathways: [],
      classSize: CLASS_SIZES[3],
      mathLevel: 'Medium',
      needs: [],
    };
    setSubProfiles((prev) => [...prev, next]);
    setActiveSubProfileId(id);
  };

  const removeSubProfile = (id: string) => {
    if (subProfiles.length <= 1) return;
    const next = subProfiles.filter((p) => p.id !== id);
    setSubProfiles(next);
    if (activeSubProfileId === id) setActiveSubProfileId(next[0].id);
  };

  const clearDefaults = () => {
    localStorage.removeItem(DEFAULTS_KEY);
    setHasSavedDefaults(false);
  };

  const openSet = (set: GeneratedSet) => {
    localStorage.setItem('mathcraft_last_generated_set', JSON.stringify(set));
    navigate('/results');
  };

  const deleteFromHistory = (id: string) => {
    const next = history.filter((s) => s.id !== id);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const deleteSavedSet = (id: string) => {
    const next = savedSets.filter((s) => s.id !== id);
    setSavedSets(next);
    localStorage.setItem(SAVED_SETS_KEY, JSON.stringify(next));
  };

  const activeList = activeTab === 'history' ? history.slice(0, 20) : savedSets;

  return (
    <main className={styles.accountPage}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="MathCraft home">
          <span className={styles.brandMark}>M</span>
          <span>MathCraft</span>
        </a>
        <button className={styles.backButton} onClick={() => navigate('/dashboard')}>
          <span aria-hidden="true">←</span> Back to dashboard
        </button>
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
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <span className={styles.cardIcon} aria-hidden="true">{icons.sliders}</span>
              <div>
                <h2>Global defaults</h2>
                <p className={styles.cardSubtitle}>Applies to all profiles.</p>
              </div>
            </div>

            <div className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>Subjects</span>
              <div className={styles.subjectRow}>
                {profile.subjects.map((subject) => (
                  <span key={subject} className={styles.subjectPill}>{subject}</span>
                ))}
              </div>
            </div>

            <div className={styles.fieldBlock}>
              <span className={styles.fieldLabel}>Language</span>
              <div className={styles.languageRow}>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    className={`${styles.languagePill} ${profile.defaultLanguage === lang ? styles.languagePillActive : ''}`}
                    onClick={() => setProfile((p) => ({ ...p, defaultLanguage: lang }))}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.fieldBlock}>
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

        </aside>

        <div className={styles.mainContent}>
          
          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <span className={styles.cardIcon} aria-hidden="true">{icons.person}</span>
              <div>
                <h2>Teaching profiles</h2>
                <p className={styles.cardSubtitle}>Fine-tune the generator for each specific class.</p>
              </div>
            </div>

            <div className={styles.profileTabs}>
              {subProfiles.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  className={`${styles.profileTab} ${sp.id === activeSubProfile.id ? styles.profileTabActive : ''}`}
                  onClick={() => setActiveSubProfileId(sp.id)}
                >
                  {sp.name}
                  {subProfiles.length > 1 && sp.id === activeSubProfile.id && (
                    <span
                      className={styles.profileTabRemove}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSubProfile(sp.id);
                      }}
                    >
                      ×
                    </span>
                  )}
                </button>
              ))}
              <button type="button" className={styles.addProfileButton} onClick={addSubProfile}>
                <span aria-hidden="true">{icons.plus}</span> Add profile
              </button>
            </div>

            <div className={styles.profileEditor}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Profile name</span>
                <input
                  value={activeSubProfile.name}
                  onChange={(e) => updateActiveSubProfile({ name: e.target.value })}
                />
              </label>

              <div className={styles.fieldRow}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Grade</span>
                  <select
                    className={styles.select}
                    value={activeSubProfile.grade}
                    onChange={(e) => updateActiveSubProfile({ grade: e.target.value })}
                  >
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Curriculum</span>
                  <select
                    className={styles.select}
                    value={activeSubProfile.curriculum}
                    onChange={(e) => updateActiveSubProfile({ curriculum: e.target.value })}
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
                        checked={activeSubProfile.pathways.includes(p.value)}
                        onChange={() => updateActiveSubProfile({ pathways: toggleInArray(activeSubProfile.pathways, p.value) })}
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
                    value={activeSubProfile.classSize}
                    onChange={(e) => updateActiveSubProfile({ classSize: e.target.value })}
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
                        className={`${styles.segmentPill} ${activeSubProfile.mathLevel === level ? styles.segmentPillActive : ''}`}
                        onClick={() => updateActiveSubProfile({ mathLevel: level })}
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
                        checked={activeSubProfile.needs.includes(need)}
                        onChange={() => updateActiveSubProfile({ needs: toggleInArray(activeSubProfile.needs, need) })}
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

            {activeList.length === 0 ? (
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
                        <strong>{(activeTab === 'sets' ? item.name : null) || item.topic || 'Math problem'}</strong>
                        <span>
                          {activeTab === 'history'
                            ? `${new Date(item.createdAt).toLocaleDateString()} · ${item.prepLevel}`
                            : `${item.questions.length} questions · ${item.prepLevel}`}
                        </span>
                      </button>
                      <button
                        className={styles.deleteIcon}
                        onClick={() => (activeTab === 'history' ? deleteFromHistory(item.id) : deleteSavedSet(item.id))}
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