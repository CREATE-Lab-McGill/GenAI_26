import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from '../styles/LandingPageStyles.module.css';

interface Step {
  n: string;
  title: string;
  body: string;
}

interface Pillar {
  title: string;
  body: string;
  icon: ReactNode;
}

const cx = (...classes: Array<string | false | undefined>): string =>
  classes.filter(Boolean).join(' ');

const steps: Step[] = [
  {
    n: '1',
    title: 'Define the lesson',
    body: 'Choose the topic, learning standard (optional), problem formats, and any real-world context you want to include.',
  },
  {
    n: '2',
    title: 'Customize the challenge',
    body: 'Select the difficulty, scaffolding level, question types, and how many problems to generate.',
  },
  {
    n: '3',
    title: 'Review and generate',
    body: 'Check the summary, adjust your settings if needed, then generate an editable problem set.',
  },
];

const pillars: Pillar[] = [
  {
    title: 'Built for teachers',
    body: 'Choose topics, problem formats, difficulty, and scaffolding without writing long prompts.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M14 4v5h5" />
        <path d="M8 13h8M8 16.5h5" />
      </svg>
    ),
  },
  {
    title: 'Flexible generation',
    body: 'Generate different types of math problems and adjust the settings before creating the final set.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
  },
  {
    title: 'Save your workflow',
    body: 'Save your preferred generation settings and reuse them whenever you create a new problem set.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.4-2-3.4-2.3.8a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.3-.8-2 3.4 2 1.4a7.6 7.6 0 0 0 0 3l-2 1.4 2 3.4 2.3-.8a7.6 7.6 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.6 7.6 0 0 0 2.6-1.5l2.3.8 2-3.4Z" />
      </svg>
    ),
  },
];

const LandingPage = (): React.ReactElement => {
  const navigate = useNavigate();

  return (
    <div className={styles.landingPage}>
      <header className={styles.landingNav}>
        <Link className={styles.brand} to="/" aria-label="MathCraft home">
          <span className={styles.brandMark}>M</span>
          <span>MathCraft</span>
        </Link>

        <nav className={styles.landingNavLinks} aria-label="Primary">
          <a href="#how-it-works">How it works</a>
          <a href="#for-teachers">For teachers</a>
        </nav>

        <div className={styles.landingNavActions}>
          <button className={styles.ghostButton} onClick={() => navigate('/account')}>
            Sign in
          </button>
          <button className={styles.primaryButton} onClick={() => navigate('/generate')}>
            Get started
          </button>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Generate. Review. Teach.</span>
            <h1>
              Turn a topic into a<br />
              <em>classroom-ready</em> problem set.
            </h1>
            <p>
              Tell MathCraft what your students are learning, choose the difficulty, problem formats, and support level, then generate an editable problem set tailored to your classroom.
            </p>
            <div className={styles.heroActions}>
              <button
                className={cx(styles.primaryButton, styles.large)}
                onClick={() => navigate('/generate')}
              >
                Start generating <span aria-hidden="true">&rarr;</span>
              </button>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.cardStack}>
              <div className={cx(styles.mockCard, styles.card3)} />
              <div className={cx(styles.mockCard, styles.card2)} />
              <div className={cx(styles.mockCard, styles.card1)}>
                <div className={styles.mockTags}>
                  <span className={cx(styles.mockTag, styles.tagCurr)}>Curr &middot; Ratios</span>
                  <span className={cx(styles.mockTag, styles.tagPrep)}>Sec III</span>
                  <span className={cx(styles.mockTag, styles.tagDiff)}>Diff Hard</span>
                </div>
                <div className={cx(styles.mockLine, styles.line1)} />
                <div className={cx(styles.mockLine, styles.line2)} />
                <div className={cx(styles.mockLine, styles.line3)} />
                <div className={styles.mockSteps}>
                  <span className={cx(styles.mockDot, styles.done)} />
                  <span className={cx(styles.mockDot, styles.done)} />
                  <span className={cx(styles.mockDot, styles.active)} />
                  <span className={styles.mockDot} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.howItWorks} id="how-it-works">
          <span className={cx(styles.eyebrow, styles.center)}>How it works</span>
          <h2>Three steps, start to classroom.</h2>

          <div className={styles.stepsRow}>
            {steps.map((step, i) => (
              <div className={styles.stepCard} key={step.n}>
                <div className={styles.stepHead}>
                  <span className={styles.stepNumber}>{step.n}</span>
                  {i < steps.length - 1 && <span className={styles.stepLine} aria-hidden="true" />}
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.pillars} id="for-teachers">
          <div className={styles.pillarsGrid}>
            {pillars.map((p) => (
              <div className={styles.pillarCard} key={p.title}>
                <div className={styles.pillarIcon}>{p.icon}</div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.ctaBand}>
          <h2>Your next problem set is a few clicks away.</h2>
          <p>Choose your topic, customize the settings, and let MathCraft generate your next problem set.</p>
          <button
            className={cx(styles.primaryButton, styles.large, styles.onDark)}
            onClick={() => navigate('/generate')}
          >
            Start generating <span aria-hidden="true">&rarr;</span>
          </button>
        </section>
      </main>

      <footer className={styles.landingFooter}>
        <div className={cx(styles.brand, styles.small)}>
          <span className={styles.brandMark}>M</span>
          <span>MathCraft</span>
        </div>
        <p>Built for math instructors at every level.</p>
      </footer>
    </div>
  );
};

export default LandingPage;