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
                aria-label="Give feedback"
                title="Feedback"
            >
                <MessageSquare size={size === 'small' ? 14 : 16} strokeWidth={1.8} />
            </button>

            {isOpen && (
                <div className={styles.panel}>
                    {submitted ? (
                        <p className={styles.thanks}>Thank you for your feedback!</p>
                    ) : (
                        <>
                            <div className={styles.panelHeader}>
                                <h3>Share your thoughts</h3>
                                <p>How was your experience?</p>
                            </div>

                            <div className={styles.ratingRow}>
                                <button
                                    className={`${styles.ratingBtn} ${rating === 'positive' ? styles.ratingActive : ''
                                        }`}
                                    onClick={() => setRating('positive')}
                                    aria-label="Positive feedback"
                                >
                                    <ThumbsUp size={19} strokeWidth={1.8} />
                                </button>

                                <button
                                    className={`${styles.ratingBtn} ${rating === 'negative' ? styles.ratingActive : ''
                                        }`}
                                    onClick={() => setRating('negative')}
                                    aria-label="Negative feedback"
                                >
                                    <ThumbsDown size={19} strokeWidth={1.8} />
                                </button>
                            </div>

                            <textarea
                                className={styles.textarea}
                                rows={3}
                                placeholder="Anything you'd like to share? (optional)"
                                value={message}
                                onChange={(event) => setMessage(event.target.value)}
                            />

                            <div className={styles.actions}>
                                <button
                                    className={styles.cancel}
                                    onClick={() => setIsOpen(false)}
                                >
                                    Cancel
                                </button>

                                <button
                                    className={styles.submit}
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || (!message.trim() && !rating)}
                                >
                                    {isSubmitting ? 'Sending...' : 'Submit'}
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