import type { TourSlide } from '../types/tutorial';
import styles from '../styles/TutorialStyles.module.css';

const previews = {
  landing: (
    <>
      <div className={styles.previewTagRow}>
        <span className={`${styles.previewTag} ${styles.previewTagTeal}`}>Curr · Ratios</span>
        <span className={`${styles.previewTag} ${styles.previewTagSky}`}>Sec III</span>
      </div>
      <div className={styles.previewBar} style={{ width: '85%' }} />
      <div className={styles.previewBar} style={{ width: '55%' }} />
    </>
  ),
  dashboard: (
    <>
      <div className={styles.previewRow}>
        <div className={styles.previewChip} />
        <div className={styles.previewLines}>
          <div className={styles.previewLineSm} />
          <div className={styles.previewLineXs} />
        </div>
      </div>
      <div className={styles.previewTagRow}>
        <span className={`${styles.previewTag} ${styles.previewTagTeal}`}>Sec IV</span>
        <span className={`${styles.previewTag} ${styles.previewTagViolet}`}>Sec V</span>
      </div>
    </>
  ),
  generator: (
    <>
      <div className={styles.previewBar} style={{ width: '90%' }} />
      <div className={styles.previewBar} style={{ width: '65%' }} />
      <div className={styles.previewStepDots}>
        <span className={`${styles.previewStepDot} ${styles.previewStepDotDone}`} />
        <span className={`${styles.previewStepDot} ${styles.previewStepDotDone}`} />
        <span className={`${styles.previewStepDot} ${styles.previewStepDotActive}`} />
        <span className={styles.previewStepDot} />
      </div>
    </>
  ),
  output: (
    <>
      <div className={styles.previewCheckRow}>
        <span className={styles.previewCheck}>✓</span>
        <div className={styles.previewLineSm} style={{ width: '80%' }} />
      </div>
      <div className={styles.previewCheckRow}>
        <span className={styles.previewCheck}>✓</span>
        <div className={styles.previewLineSm} style={{ width: '60%' }} />
      </div>
    </>
  ),
  account: (
    <>
      <div className={styles.previewRow}>
        <div className={styles.previewAvatar} />
        <div className={styles.previewLines}>
          <div className={styles.previewLineSm} />
          <div className={styles.previewLineXs} />
        </div>
      </div>
      <div className={styles.previewTagRow}>
        <span className={`${styles.previewTag} ${styles.previewTagTeal}`}>Prep 1</span>
        <span className={`${styles.previewTag} ${styles.previewTagTeal}`}>Prep 2</span>
      </div>
    </>
  ),
};

export const APP_TOUR_SLIDES: TourSlide[] = [
  {
    key: 'landing',
    eyebrow: 'Welcome',
    title: 'Welcome to MathCraft',
    body: 'Generate curriculum-aligned math problem sets in minutes. Here\'s a quick look at how it works.',
    preview: previews.landing,
  },
  {
    key: 'dashboard',
    eyebrow: 'Dashboard',
    title: 'Your control center',
    body: 'Pick the prep level you\'re generating for, review your recent activity, and jump into your saved sets.',
    preview: previews.dashboard,
  },
  {
    key: 'generator',
    eyebrow: 'Generator',
    title: 'Build your problem set',
    body: 'Set the topic, difficulty, scaffolding level, and how many questions you want. All in 4 simple steps.',
    preview: previews.generator,
  },
  {
    key: 'output',
    eyebrow: 'Output',
    title: 'Review and edit',
    body: 'Edit each question manually or with AI, reorder them, and export the student sheet or the teacher key.',
    preview: previews.output,
  },
  {
    key: 'account',
    eyebrow: 'Account',
    title: 'Save your preferences',
    body: 'Create prep profiles for each class and save your favorite generation settings as defaults.',
    preview: previews.account,
  },
];