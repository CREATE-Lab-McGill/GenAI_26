import type { ReactNode } from 'react';

export interface TourSlide {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  preview: ReactNode;
}