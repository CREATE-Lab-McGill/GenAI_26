import { useLanguage } from '../i18n/language';
import { useState } from 'react';
import { MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react';
import { submitFeedback } from '../api/client';
import styles from '../styles/FeedbackStyles.module.css';

interface FeedbackContext {
  section?: string;
  metadata?: Record<string, unknown>;
}

const FeedbackButton = ({
  context,
  size = 'default',
}: {
  context?: FeedbackContext;
  size?: 'default' | 'small';
}): React.ReactElement => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() && !rating) return;

    setIsSubmitting(true);

    try {
      await submitFeedback({
        message: message.trim(),
        rating: rating ?? undefined,
        section: context?.section,
        metadata: context?.metadata,
      });

      setSubmitted(true);

      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setMessage('');
        setRating(null);
      }, 1500);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.trigger} ${size === 'small' ? styles.triggerSmall : ''}`}
        onClick={() => setIsOpen((value) => !value)}
        aria-label={t('Give feedback')}
        title={t('Feedback')}
      >
        <MessageSquare size={size === 'small' ? 14 : 16} strokeWidth={1.8} />
      </button>

      {isOpen && (
        <div className={styles.panel}>
          {submitted ? (
            <p className={styles.thanks}>{t('Thank you for your feedback!')}</p>
          ) : (
            <>
              <div className={styles.panelHeader}>
                <h3>{t('Share your thoughts')}</h3>
                <p>{t('How was your experience?')}</p>
              </div>

              <div className={styles.ratingRow}>
                <button
                  className={`${styles.ratingBtn} ${rating === 'positive' ? styles.ratingActive : ''}`}
                  onClick={() => setRating('positive')}
                  aria-label={t('Positive feedback')}
                >
                  <ThumbsUp size={19} strokeWidth={1.8} />
                </button>

                <button
                  className={`${styles.ratingBtn} ${rating === 'negative' ? styles.ratingActive : ''}`}
                  onClick={() => setRating('negative')}
                  aria-label={t('Negative feedback')}
                >
                  <ThumbsDown size={19} strokeWidth={1.8} />
                </button>
              </div>

              <textarea
                className={styles.textarea}
                rows={3}
                placeholder={t("Anything you'd like to share? (optional)")}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />

              <div className={styles.actions}>
                <button className={styles.cancel} onClick={() => setIsOpen(false)}>
                  {t('Cancel')}
                </button>

                <button
                  className={styles.submit}
                  onClick={handleSubmit}
                  disabled={isSubmitting || (!message.trim() && !rating)}
                >
                  {isSubmitting ? t('Sending...') : t('Submit')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FeedbackButton;
