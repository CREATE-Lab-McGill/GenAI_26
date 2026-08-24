import { useEffect, useState } from 'react';
import type { TourSlide } from '../types/tutorial';
import styles from '../styles/TutorialStyles.module.css';

interface TutorialModalProps {
  tourKey: string;
  slides: TourSlide[];
  onFinish?: () => void;
}

const SEEN_PREFIX = 'mathcraft_tutorial_seen_';

const TutorialModal = ({ tourKey, slides, onFinish }: TutorialModalProps): React.ReactElement | null => {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(SEEN_PREFIX + tourKey);
    if (!seen && slides.length > 0) {
      setActive(true);
    }
  }, [tourKey, slides.length]);

  const finish = () => {
    localStorage.setItem(SEEN_PREFIX + tourKey, 'true');
    setActive(false);
    onFinish?.();
  };

  const next = () => {
    if (index < slides.length - 1) {
      setIndex((i) => i + 1);
    } else {
      finish();
    }
  };

  const back = () => setIndex((i) => Math.max(0, i - 1));

  if (!active) return null;

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>

        <div className={styles.previewFrame} aria-hidden="true">
          <div className={styles.previewDots}>
            <span /><span /><span />
          </div>
          <div className={styles.previewBody}>
            {slide.preview}
          </div>
        </div>

        <span className={styles.eyebrow}>{slide.eyebrow}</span>

        <h3 className={styles.title}>{slide.title}</h3>
        <p className={styles.body}>{slide.body}</p>

        <div className={styles.dots}>
          {slides.map((s, i) => (
            <button
              key={s.key}
              className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.skipBtn} onClick={finish}>
            Skip tour
          </button>

          <div className={styles.navGroup}>
            {index > 0 && (
              <button className={styles.secondaryBtn} onClick={back}>
                Back
              </button>
            )}
            <button className={styles.primaryBtn} onClick={next}>
              {isLast ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;