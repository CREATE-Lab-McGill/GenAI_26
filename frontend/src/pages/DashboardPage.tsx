import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_PROFILE } from '../services/mockData';
import type { PrepLevel, GeneratedSet } from '../types/problem';
import { getSets } from '../api/client';
import styles from '../styles/DashboardPageStyles.module.css';
import FeedbackButton from '../components/Feedback';
import ProfileButton from '../components/Profile';

const LAST_SET_KEY = 'mathcraft_last_generated_set';

function timeAgo(iso: string): string {
  const hours = Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const icons = {
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M14 4v5h5" />
      <path d="M8 13h8M8 16.5h5" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M14 4v5h5" />
      <path d="M12 12v5M9.5 14.5h5" />
    </svg>
  ),
  bookmark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M6 4h12v16l-6-4-6 4Z" />
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
  layers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="m12 3 8.5 5-8.5 5-8.5-5L12 3Z" />
      <path d="m3.5 13 8.5 5 8.5-5" />
    </svg>
  ),
  scenario: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
};

const PROBLEM_TYPES = [
  {
    key: 'problem-set',
    label: 'Problem Set',
    description: 'Multiple questions',
    icon: icons.document,
    route: '/generate',
  },
  {
    key: 'situational',
    label: 'Situational Problem',
    description: 'Real-world scenario, multiple topics',
    icon: icons.scenario,
    route: '/generate-situational',
  },
] as const;

const QUICK_ACTIONS = [
  {
    key: 'new-set',
    label: 'New problem set',
    description: 'Start fresh from the generator',
    route: '/generate',
    icon: icons.plus,
    colorClass: styles.iconTeal,
  },
  {
    key: 'saved-sets',
    label: 'View saved sets',
    description: 'Sets you kept for reuse',
    route: '/account',
    icon: icons.bookmark,
    colorClass: styles.iconViolet,
  },
  {
    key: 'defaults',
    label: 'Edit generation defaults',
    description: 'Update your usual settings',
    route: '/account',
    icon: icons.sliders,
    colorClass: styles.iconSky,
  },
] as const;

const Dashboard = (): React.ReactElement => {
  const navigate = useNavigate();
  const profile = MOCK_PROFILE;
  const [selectedPrep, setSelectedPrep] = useState<PrepLevel>(profile.prepLevels[0]);
  const firstName = profile.name.split(' ')[0];

  const [recentSets, setRecentSets] = useState<GeneratedSet[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const [selectedType, setSelectedType] = useState<typeof PROBLEM_TYPES[number]['key'] | null>(null);
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTypeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    getSets()
      .then((data: GeneratedSet[]) => setRecentSets(data.slice(0, 5)))
      .catch((error) => console.error('Failed to load recent activity:', error))
      .finally(() => setLoadingRecent(false));
  }, []);

  const openSet = (set: GeneratedSet) => {
    localStorage.setItem(LAST_SET_KEY, JSON.stringify(set));
    navigate('/results');
  };

  const handleGenerate = () => {
    if (!selectedType) return;
    const type = PROBLEM_TYPES.find((t) => t.key === selectedType)!;
    navigate(type.route, { state: { prepLevel: selectedPrep } });
  };

  const selectedTypeData = selectedType
    ? PROBLEM_TYPES.find(t => t.key === selectedType)
    : null;

  return (
    <main className={styles.dashboard}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="MathCraft home">
          <span className={styles.brandMark}>M</span>
          <span>MathCraft</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FeedbackButton />
          <ProfileButton variant="full" name={profile.name} subtitle={profile.school} />
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCard}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Welcome back</span>
            <h1>
              Hey <span className={styles.gradientText}>{firstName}</span> <span aria-hidden="true">!</span>
            </h1>
            <p>Ready to build your next problem set? Pick a prep level and jump straight into generating.</p>
          </div>

          <div className={styles.prepSection}>
            <span className={styles.prepLabel}>Generating for</span>
            <div className={styles.prepGrid}>
              {profile.prepLevels.map((level) => {
                const isActive = selectedPrep === level;
                return (
                  <button
                    key={level}
                    type="button"
                    className={`${styles.prepCard} ${isActive ? styles.prepCardActive : ''}`}
                    onClick={() => setSelectedPrep(level)}
                  >
                    {isActive && <span className={styles.prepCheck}>✓</span>}
                    <span className={styles.prepIcon} aria-hidden="true">{icons.layers}</span>
                    <span className={styles.prepName}>{level}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.typeSection}>
              <span className={styles.prepLabel}>What are you generating</span>

              <div className={styles.customDropdown} ref={dropdownRef}>
                <button
                  type="button"
                  className={`${styles.dropdownTrigger} ${isTypeMenuOpen ? styles.dropdownTriggerActive : ''}`}
                  onClick={() => setIsTypeMenuOpen(!isTypeMenuOpen)}
                >
                  {selectedTypeData ? (
                    <>
                      <span className={styles.prepIcon} aria-hidden="true">{selectedTypeData.icon}</span>
                      <div className={styles.typeCopy}>
                        <span className={styles.prepName}>{selectedTypeData.label}</span>
                        <span className={styles.typeDescription}>{selectedTypeData.description}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className={styles.prepIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                          <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
                          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                          <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
                        </svg>
                      </span>
                      <div className={styles.typeCopy}>
                        <span className={styles.prepName} style={{ color: 'var(--ink-soft)' }}>
                          Select problem type
                        </span>
                      </div>
                    </>
                  )}
                  <span className={`${styles.dropdownChevron} ${isTypeMenuOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>

                {isTypeMenuOpen && (
                  <div className={styles.dropdownMenu}>
                    {PROBLEM_TYPES.map((type) => {
                      const isActive = selectedType === type.key;
                      return (
                        <button
                          key={type.key}
                          type="button"
                          className={`${styles.dropdownItem} ${isActive ? styles.dropdownItemActive : ''}`}
                          onClick={() => {
                            setSelectedType(type.key);
                            setIsTypeMenuOpen(false);
                          }}
                        >
                          <span className={styles.prepIcon} aria-hidden="true">{type.icon}</span>
                          <div className={styles.typeCopy}>
                            <span className={styles.prepName}>{type.label}</span>
                            <span className={styles.typeDescription}>{type.description}</span>
                          </div>
                          {isActive && <span className={styles.typeCheck}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <button 
              className={styles.generateButton} 
              onClick={handleGenerate}
              disabled={!selectedType}
              style={{ opacity: !selectedType ? 0.5 : 1, cursor: !selectedType ? 'not-allowed' : 'pointer' }}
            >
              {selectedTypeData 
                ? `Generate ${selectedTypeData.label.toLowerCase()} for ${selectedPrep}` 
                : `Select a type to generate for ${selectedPrep}`
              } 
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.recentCard}>
          <div className={styles.cardHeader}>
            <h2>Recent activity</h2>
            <button className={styles.textLink} onClick={() => navigate('/account')}>View all</button>
          </div>
          {loadingRecent ? (
            <p className={styles.emptyState}>Loading…</p>
          ) : recentSets.length === 0 ? (
            <p className={styles.emptyState}>No sets generated yet, your history will show up here.</p>
          ) : (
            <ul className={styles.activityList}>
              {recentSets.map((item) => (
                <li key={item.id} className={styles.activityItem}>
                  <span className={`${styles.activityIcon} ${styles.iconTeal}`} aria-hidden="true">
                    {icons.document}
                  </span>
                  <button className={styles.activityMain} onClick={() => openSet(item)}>
                    <strong>{item.name || item.topic || 'Untitled set'}</strong>
                    <p>{item.topic} · {item.prepLevel} · {item.questions.length} questions</p>
                  </button>
                  <span className={styles.activityTime}>{timeAgo(item.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.quickActions}>
          <h2>Quick actions</h2>
          {QUICK_ACTIONS.map((action) => (
            <button key={action.key} className={styles.actionRow} onClick={() => navigate(action.route)}>
              <span className={`${styles.actionIcon} ${action.colorClass}`} aria-hidden="true">
                {action.icon}
              </span>
              <span className={styles.actionCopy}>
                <strong>{action.label}</strong>
                <small>{action.description}</small>
              </span>
              <span className={styles.actionChevron} aria-hidden="true">›</span>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
};

export default Dashboard;