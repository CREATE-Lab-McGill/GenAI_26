import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import type { GeneratedSet, Collection } from '../types/problem';
import {
  getSets,
  getCollections,
  createCollection,
  deleteCollection,
  deleteSet,
  saveSet,
} from '../api/client';
import styles from '../styles/LibraryPageStyles.module.css';
import FeedbackButton from '../components/Feedback';

const LAST_SET_KEY = 'mathcraft_last_generated_set';
const MOVE_SEARCH_THRESHOLD = 5; 

type LibSet = GeneratedSet & { difficulty?: string; savedAt?: string };
type Scope = 'all' | 'saved';
type Sort = 'newest' | 'oldest' | 'name' | 'questions';
type View = 'grid' | 'list';
type DateRange = 'any' | '7' | '30' | '90';
type Facet = 'preps' | 'topics' | 'difficulties' | 'formats';
type CollectionKey = 'all' | string;

interface Filters {
  preps: string[];
  topics: string[];
  difficulties: string[];
  formats: string[];
}

interface MenuPos {
  top: number;
  left: number;
  maxHeight: number;
}

const EMPTY_FILTERS: Filters = { preps: [], topics: [], difficulties: [], formats: [] };

const FACETS: { key: Facet; label: string; tone: 'teal' | 'violet' | 'sky' | 'rose' }[] = [
  { key: 'preps', label: 'Grade', tone: 'teal' },
  { key: 'topics', label: 'Topic', tone: 'violet' },
  { key: 'difficulties', label: 'Difficulty', tone: 'sky' },
  { key: 'formats', label: 'Format', tone: 'rose' },
];

const uniq = <T,>(arr: T[]): T[] => Array.from(new Set(arr));
const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

const mainTopic = (s: LibSet): string =>
  ((s.formData as any)?.mainTopic || s.topic || 'Untitled').split(':')[0].trim();

const facetValues = (s: LibSet, facet: Facet): string[] => {
  switch (facet) {
    case 'preps':
      return s.prepLevel ? [s.prepLevel] : [];
    case 'topics':
      return [mainTopic(s)];
    case 'difficulties': {
      const fromQuestions = uniq(s.questions.map((q) => q.difficulty).filter(Boolean) as string[]);
      return fromQuestions.length ? fromQuestions : s.difficulty ? [s.difficulty] : [];
    }
    case 'formats':
      return uniq(s.questions.map((q) => q.format).filter(Boolean) as string[]);
  }
};

const matchesFacets = (s: LibSet, f: Filters, skip?: Facet): boolean =>
  FACETS.every(({ key }) => {
    if (key === skip || f[key].length === 0) return true;
    const values = facetValues(s, key);
    return f[key].some((v) => values.includes(v));
  });

const icons = {
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  ),
  folder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="m12 3 8.5 5-8.5 5-8.5-5L12 3Z" />
      <path d="m3.5 13 8.5 5 8.5-5" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 13V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7" />
      <path d="M4 13h4l1.5 3h5L16 13h4v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
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
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.6}>
      <path d="M6 4h12v16l-6-4-6 4Z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  dots: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  ),
};

const Library = (): React.ReactElement => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? {}) as { collectionId?: string };

  const [sets, setSets] = useState<LibSet[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeCollection, setActiveCollection] = useState<CollectionKey>(navState.collectionId ?? 'all');
  const [scope, setScope] = useState<Scope>('saved');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [view, setView] = useState<View>('grid');
  const [dateRange, setDateRange] = useState<DateRange>('any');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [moveQuery, setMoveQuery] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    getSets()
      .then((data: LibSet[]) => setSets(data))
      .catch((e) => console.error('Failed to load sets:', e))
      .finally(() => setLoading(false));
    getCollections()
      .then((data: Collection[]) => setCollections(data))
      .catch((e) => console.error('Failed to load collections:', e));
  }, []);

  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);

    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-menu-trigger]')) return; 
      if (menuRef.current && !menuRef.current.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      close();
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', onScroll, true); 
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [menuId]);

  const toggleMenu = (id: string, e: React.MouseEvent<HTMLElement>) => {
    if (menuId === id) {
      setMenuId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const top = rect.bottom + 6;
    setMenuPos({
      top,
      left: rect.right,
      maxHeight: Math.max(160, Math.min(340, window.innerHeight - top - 12)),
    });
    setMoveQuery('');
    setMenuId(id);
  };

  const renderMenu = (children: React.ReactNode) =>
    menuPos && pageRef.current
      ? createPortal(
          <div
            ref={menuRef}
            className={styles.menu}
            role="menu"
            style={{ top: menuPos.top, left: menuPos.left, maxHeight: menuPos.maxHeight }}
          >
            {children}
          </div>,
          pageRef.current 
        )
      : null;

  const collectionName = (id?: string | null) =>
    id ? collections.find((c) => c.id === id)?.name : undefined;

  const inScope = useMemo(
    () => sets.filter((s) => (scope === 'saved' ? s.isSaved : true)),
    [sets, scope]
  );

  const collectionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    inScope.forEach((s) => {
      if (!s.collectionId) return;
      map[s.collectionId] = (map[s.collectionId] ?? 0) + 1;
    });
    return map;
  }, [inScope]);

  const filteredCollections = useMemo(() => {
    const q = moveQuery.trim().toLowerCase();
    return q ? collections.filter((c) => c.name.toLowerCase().includes(q)) : collections;
  }, [collections, moveQuery]);

  const baseSets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cutoff = dateRange === 'any' ? 0 : Date.now() - Number(dateRange) * 24 * 60 * 60 * 1000;

    return inScope.filter((s) => {
      if (activeCollection !== 'all' && s.collectionId !== activeCollection) return false;
      if (cutoff && new Date(s.createdAt).getTime() < cutoff) return false;
      if (q) {
        const haystack = [
          s.name,
          s.topic,
          s.prepLevel,
          (s.formData as any)?.subtopic,
          ...s.questions.map((x) => x.subtopic),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [inScope, activeCollection, search, dateRange]);

  const facetOptions = useMemo(() => {
    const result = {} as Record<Facet, { value: string; count: number }[]>;
    FACETS.forEach(({ key }) => {
      const counts: Record<string, number> = {};
      baseSets
        .filter((s) => matchesFacets(s, filters, key))
        .forEach((s) => facetValues(s, key).forEach((v) => (counts[v] = (counts[v] ?? 0) + 1)));
      filters[key].forEach((v) => (counts[v] = counts[v] ?? 0));
      result[key] = Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    });
    return result;
  }, [baseSets, filters]);

  const results = useMemo(() => {
    const list = baseSets.filter((s) => matchesFacets(s, filters));
    const label = (s: LibSet) => (s.name || s.topic || '').toLowerCase();
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return label(a).localeCompare(label(b));
        case 'questions':
          return b.questions.length - a.questions.length;
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [baseSets, filters, sort]);

  const activeFilterCount =
    FACETS.reduce((n, f) => n + filters[f.key].length, 0) + (dateRange !== 'any' ? 1 : 0);

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setDateRange('any');
    setSearch('');
  };

  const openSet = (set: LibSet) => {
    localStorage.setItem(LAST_SET_KEY, JSON.stringify(set));
    navigate('/results');
  };

  const handleDeleteSet = async (set: LibSet) => {
    setMenuId(null);
    if (!window.confirm(`Delete "${set.name || set.topic || 'this set'}"? This can't be undone.`)) return;
    const previous = sets;
    setSets((prev) => prev.filter((s) => s.id !== set.id));
    try {
      await deleteSet(set.id);
    } catch (e) {
      console.error('Failed to delete set:', e);
      setSets(previous);
    }
  };

  const handleMove = async (set: LibSet, collectionId: string | null) => {
    setMenuId(null);
    const previous = sets;
    setSets((prev) => prev.map((s) => (s.id === set.id ? { ...s, collectionId, isSaved: true } : s)));
    try {
      await saveSet(set.id, collectionId);
    } catch (e) {
      console.error('Failed to move set:', e);
      setSets(previous);
    }
  };

  const handleCreateCollection = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const created: Collection = await createCollection(name);
      setCollections((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveCollection(created.id);
      setNewName('');
      setIsCreating(false);
    } catch (e) {
      console.error('Failed to create collection:', e);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    setMenuId(null);
    const name = collectionName(id) ?? 'this collection';
    if (!window.confirm(`Delete "${name}"? Its sets will not be deleted, they will just be removed from the collection.`)) return;

    const prevCollections = collections;
    const prevSets = sets;
    setCollections((prev) => prev.filter((c) => c.id !== id));
    setSets((prev) => prev.map((s) => (s.collectionId === id ? { ...s, collectionId: null } : s)));
    if (activeCollection === id) setActiveCollection('all');
    try {
      await deleteCollection(id);
    } catch (e) {
      console.error('Failed to delete collection:', e);
      setCollections(prevCollections);
      setSets(prevSets);
    }
  };

  const heading = activeCollection === 'all' ? 'All sets' : collectionName(activeCollection) ?? 'Collection';

  const renderNavItem = (key: CollectionKey, label: string, icon: React.ReactNode, count: number, deletable = false) => {
    const active = activeCollection === key;
    return (
      <li key={key} className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}>
        <button type="button" className={styles.navMain} onClick={() => setActiveCollection(key)}>
          <span className={styles.navIcon} aria-hidden="true">{icon}</span>
          <span className={styles.navName}>{label}</span>
          <span className={styles.navCount}>{count}</span>
        </button>
        {deletable && (
          <button
            type="button"
            className={styles.deleteBtn}
            aria-label={`Delete ${label}`}
            title="Delete collection"
            onClick={() => handleDeleteCollection(key)}
          >
            {icons.trash}
          </button>
        )}
      </li>
    );
  };

  const renderSet = (set: LibSet) => {
    const open = menuId === set.id;
    const difficulties = facetValues(set, 'difficulties');
    const colName = collectionName(set.collectionId);

    return (
      <li key={set.id} className={`${styles.setCard} ${view === 'list' ? styles.setCardRow : ''}`}>
        <div className={styles.setTop}>
          <span className={styles.setIcon} aria-hidden="true">{icons.document}</span>
          <button type="button" className={styles.setTitleBtn} onClick={() => openSet(set)}>
            <strong>{set.name || set.topic || 'Untitled set'}</strong>
            <span>
              {new Date(set.createdAt).toLocaleDateString()} · {set.questions.length}{' '}
              {set.questions.length === 1 ? 'question' : 'questions'}
              {colName && activeCollection === 'all' && (
                <>
                  {' · '}
                  <span className={styles.metaFolder}>
                    {icons.folder}
                    {colName}
                  </span>
                </>
              )}
            </span>
          </button>

          {set.isSaved && (
            <span className={styles.savedMark} title="Saved" aria-label="Saved">
              {icons.bookmark}
            </span>
          )}

          <div className={styles.menuWrap}>
            <button
              type="button"
              className={styles.menuBtn}
              aria-label="Set options"
              aria-haspopup="menu"
              aria-expanded={open}
              data-menu-trigger
              onClick={(e) => toggleMenu(set.id, e)}
            >
              {icons.dots}
            </button>
            {open &&
              renderMenu(
                <>
                  <button type="button" role="menuitem" className={styles.menuItem} onClick={() => openSet(set)}>
                    {icons.document} Open set
                  </button>

                  {collections.length > 0 && (
                    <>
                      <div className={styles.menuDivider} />
                      <span className={styles.menuLabel}>Move to</span>
                      {collections.length > MOVE_SEARCH_THRESHOLD && (
                        <input
                          className={styles.menuSearch}
                          value={moveQuery}
                          onChange={(e) => setMoveQuery(e.target.value)}
                          placeholder="Find collection…"
                          autoFocus
                        />
                      )}
                      {filteredCollections.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          role="menuitem"
                          className={`${styles.menuItem} ${set.collectionId === c.id ? styles.menuItemCurrent : ''}`}
                          onClick={() => handleMove(set, c.id)}
                        >
                          {icons.folder} {c.name}
                        </button>
                      ))}
                      {filteredCollections.length === 0 && <span className={styles.menuEmpty}>No matches</span>}
                    </>
                  )}

                  {set.collectionId && (
                    <button
                      type="button"
                      role="menuitem"
                      className={styles.menuItem}
                      onClick={() => handleMove(set, null)}
                    >
                      {icons.inbox} Remove from collection
                    </button>
                  )}

                  <div className={styles.menuDivider} />
                  <button
                    type="button"
                    role="menuitem"
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    onClick={() => handleDeleteSet(set)}
                  >
                    {icons.trash} Delete set
                  </button>
                </>
              )}
          </div>
        </div>

        <div className={styles.tagRow}>
          {set.prepLevel && <span className={`${styles.tag} ${styles.tagTeal}`}>{set.prepLevel}</span>}
          <span className={`${styles.tag} ${styles.tagViolet}`}>{mainTopic(set)}</span>
          {difficulties.map((d) => (
            <span key={d} className={`${styles.tag} ${styles.tagSky}`}>{d}</span>
          ))}
        </div>
      </li>
    );
  };

  return (
    <main className={styles.libraryPage} ref={pageRef}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="MathCraft home">
          <span className={styles.brandMark}>M</span>
          <span>MathCraft</span>
        </a>
        <div className={styles.topbarActions}>
          <FeedbackButton />
          <button className={styles.backButton} onClick={() => navigate('/dashboard')}>
            <span aria-hidden="true">←</span> Back to dashboard
          </button>
        </div>
      </header>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <section className={styles.card}>
            <div className={styles.sideHeader}>
              <h2>Collections</h2>
              <button
                type="button"
                className={styles.addButton}
                onClick={() => setIsCreating((v) => !v)}
                aria-label="New collection"
              >
                <span aria-hidden="true">{icons.plus}</span> New
              </button>
            </div>

            {isCreating && (
              <div className={styles.createRow}>
                <input
                  className={styles.createInput}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateCollection();
                    if (e.key === 'Escape') { setIsCreating(false); setNewName(''); }
                  }}
                  placeholder="Collection name..."
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.primaryMini}
                  onClick={handleCreateCollection}
                  disabled={!newName.trim()}
                >
                  Add
                </button>
              </div>
            )}

            <ul className={styles.navList}>
              {renderNavItem('all', 'All sets', icons.layers, inScope.length)}
              {collections.length > 0 && <li className={styles.navDivider} aria-hidden="true" />}
              {collections.map((c) =>
                renderNavItem(c.id, c.name, icons.folder, collectionCounts[c.id] ?? 0, true)
              )}
            </ul>
          </section>

          <section className={styles.card}>
            <div className={styles.statsGrid}>
              <div className={styles.statBlock}>
                <strong>{loading ? '–' : sets.length}</strong>
                <span>Total sets</span>
              </div>
              <div className={styles.statBlock}>
                <strong>{loading ? '–' : sets.filter((s) => s.isSaved).length}</strong>
                <span>Saved</span>
              </div>
            </div>
          </section>
        </aside>

        <div className={styles.mainContent}>
          <section className={styles.pageHead}>
            <div>
              <span className={styles.eyebrow}>Library</span>
              <h1>{heading}</h1>
              <p>
                {loading ? 'Loading…' : `${results.length} ${results.length === 1 ? 'set' : 'sets'}`}
                {activeFilterCount > 0 || search ? ' match your filters' : ''}
              </p>
            </div>
            <button className={styles.primaryButton} onClick={() => navigate('/generate')}>
              <span aria-hidden="true">{icons.plus}</span> New set
            </button>
          </section>

          <section className={styles.card}>
            <div className={styles.toolbar}>
              <label className={styles.searchBox}>
                <span aria-hidden="true">{icons.search}</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name"
                />
              </label>

              <div className={styles.segmentRow} role="tablist" aria-label="Scope">
                <button
                  type="button"
                  className={`${styles.segmentPill} ${scope === 'saved' ? styles.segmentPillActive : ''}`}
                  onClick={() => setScope('saved')}
                >
                  Saved
                </button>
                <button
                  type="button"
                  className={`${styles.segmentPill} ${scope === 'all' ? styles.segmentPillActive : ''}`}
                  onClick={() => setScope('all')}
                >
                  Everything
                </button>
              </div>
            </div>

            <div className={styles.toolbarSecondary}>
              <button
                type="button"
                className={`${styles.ghostButton} ${showFilters ? styles.ghostButtonActive : ''}`}
                onClick={() => setShowFilters((v) => !v)}
              >
                <span className={styles.ghostIcon} aria-hidden="true">{icons.filter}</span>
                Filters
                {activeFilterCount > 0 && <span className={styles.badge}>{activeFilterCount}</span>}
              </button>

              <div className={styles.toolbarRight}>
                <select
                  className={styles.select}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  aria-label="Sort by"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name (A–Z)</option>
                  <option value="questions">Most questions</option>
                </select>

                <div className={styles.viewToggle}>
                  <button
                    type="button"
                    className={view === 'grid' ? styles.viewActive : ''}
                    onClick={() => setView('grid')}
                    aria-label="Grid view"
                  >
                    {icons.grid}
                  </button>
                  <button
                    type="button"
                    className={view === 'list' ? styles.viewActive : ''}
                    onClick={() => setView('list')}
                    aria-label="List view"
                  >
                    {icons.list}
                  </button>
                </div>
              </div>
            </div>

            {showFilters && (
              <div className={styles.filterPanel}>
                {FACETS.map(({ key, label, tone }) => (
                  <div key={key} className={styles.facet}>
                    <span className={styles.facetLabel}>{label}</span>
                    <div className={styles.chipRow}>
                      {facetOptions[key].length === 0 && <span className={styles.facetEmpty}>No options</span>}
                      {facetOptions[key].map(({ value, count }) => {
                        const active = filters[key].includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            className={`${styles.chip} ${styles[`chip_${tone}`]} ${active ? styles.chipActive : ''}`}
                            onClick={() => setFilters((f) => ({ ...f, [key]: toggle(f[key], value) }))}
                          >
                            {value}
                            <em>{count}</em>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className={styles.facet}>
                  <span className={styles.facetLabel}>Created</span>
                  <div className={styles.chipRow}>
                    {([
                      ['any', 'Any time'],
                      ['7', 'Last 7 days'],
                      ['30', 'Last 30 days'],
                      ['90', 'Last 90 days'],
                    ] as [DateRange, string][]).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.chip} ${styles.chip_teal} ${dateRange === value ? styles.chipActive : ''}`}
                        onClick={() => setDateRange(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(activeFilterCount > 0 || search) && (
              <div className={styles.activeBar}>
                <div className={styles.chipRow}>
                  {FACETS.flatMap(({ key }) =>
                    filters[key].map((v) => (
                      <button
                        key={`${key}:${v}`}
                        type="button"
                        className={styles.activeChip}
                        onClick={() => setFilters((f) => ({ ...f, [key]: f[key].filter((x) => x !== v) }))}
                      >
                        {v} <span aria-hidden="true">×</span>
                      </button>
                    ))
                  )}
                  {dateRange !== 'any' && (
                    <button type="button" className={styles.activeChip} onClick={() => setDateRange('any')}>
                      Last {dateRange} days <span aria-hidden="true">×</span>
                    </button>
                  )}
                </div>
                <button type="button" className={styles.textLink} onClick={clearAll}>
                  Clear all
                </button>
              </div>
            )}
          </section>

          {loading ? (
            <p className={styles.emptyState}>Loading your library…</p>
          ) : results.length === 0 ? (
            <div className={styles.emptyCard}>
              <span className={styles.emptyIcon} aria-hidden="true">{icons.layers}</span>
              <h3>{sets.length === 0 ? 'Your library is empty' : 'Nothing matches these filters'}</h3>
              <p>
                {sets.length === 0
                  ? 'Generate a set and save it, it will show up here.'
                  : scope === 'saved' && sets.some((s) => !s.isSaved)
                    ? 'Try switching to "Everything" or clearing some filters.'
                    : 'Try clearing some filters or searching for something else.'}
              </p>
              {sets.length === 0 ? (
                <button className={styles.primaryButton} onClick={() => navigate('/generate')}>
                  Create your first set
                </button>
              ) : (
                <button className={styles.ghostButton} onClick={clearAll}>Clear filters</button>
              )}
            </div>
          ) : (
            <ul className={view === 'grid' ? styles.grid : styles.listView}>{results.map(renderSet)}</ul>
          )}
        </div>
      </div>
    </main>
  );
};

export default Library;