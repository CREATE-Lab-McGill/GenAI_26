export type FeedbackRating = 'positive' | 'negative';

export interface FeedbackPayload {
  message: string;
  rating?: FeedbackRating;
  section?: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackEntry extends FeedbackPayload {
  id: string;
  page: string;
  createdAt: string;
}