import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LanguageProvider from '../src/i18n/LanguageProvider';
import LanguageToggle from '../src/components/LanguageToggle';
import { LANGUAGE_KEY, useLanguage, translateLabel } from '../src/i18n/language';
import { en, fr } from '../src/i18n/messages';
import { CURRICULUM_DATA } from '../src/services/curriculumData';
import {
  DIFFICULTIES,
  PREP_LEVELS,
  PROBLEM_FORMATS,
  SCAFFOLDING_LEVELS,
  OUTPUT_INCLUDES,
  DISPLAY_OPTIONS,
} from '../src/types/problem';

function Example() {
  const { t, questionCount, formatDate, timeAgo } = useLanguage();
  return (
    <>
      <LanguageToggle />
      <h1>{t('Create problem set')}</h1>
      <p>{questionCount(1)}</p>
      <p>{questionCount(2)}</p>
      <time>{formatDate('2026-10-18T15:00:00Z')}</time>
      <span>{timeAgo(new Date().toISOString())}</span>
    </>
  );
}
const renderExample = () =>
  render(
    <LanguageProvider>
      <Example />
    </LanguageProvider>,
  );

describe('language preference', () => {
  it('defaults to English, toggles both ways, updates lang, and persists', async () => {
    renderExample();
    const toggle = screen.getByRole('button', { name: 'Français' });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('heading').textContent).toBe('Create problem set');
    await userEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(document.documentElement.lang).toBe('fr');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('fr');
    expect(screen.getByRole('heading').textContent).toBe('Créer une série de problèmes');
    expect(screen.getByText('1 question')).toBeTruthy();
    expect(screen.getByText('2 questions')).toBeTruthy();
    expect(screen.getByText('à l’instant')).toBeTruthy();
    expect(screen.getByText('2026-10-18')).toBeTruthy();
    await userEvent.click(toggle);
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en');
  });
  it('restores French on a fresh mount', () => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    renderExample();
    expect(screen.getByRole('heading').textContent).toBe('Créer une série de problèmes');
    expect(document.documentElement.lang).toBe('fr');
  });
  it('falls back to English for an invalid preference', () => {
    localStorage.setItem(LANGUAGE_KEY, 'invalid');
    renderExample();
    expect(document.documentElement.lang).toBe('en');
  });
  it('supports keyboard activation and keeps focus', async () => {
    renderExample();
    const user = userEvent.setup();
    await user.tab();
    const toggle = screen.getByRole('button', { name: 'Français' });
    expect(document.activeElement).toBe(toggle);
    await user.keyboard(' ');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(toggle);
    await user.keyboard('{Enter}');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });
  it('works in memory when storage reads and writes throw', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderExample();
    await userEvent.click(screen.getByRole('button', { name: 'Français' }));
    expect(document.documentElement.lang).toBe('fr');
    expect(screen.getByRole('heading').textContent).toBe('Créer une série de problèmes');
  });
});

describe('translation catalogs', () => {
  it('has matching, nonempty entries and interpolation placeholders', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(fr[key].trim(), key).not.toBe('');
      expect(fr[key].match(/\{\w+\}/g)?.sort(), key).toEqual(en[key].match(/\{\w+\}/g)?.sort());
    }
  });
  it('covers every curriculum choice and canonical generator option', () => {
    const curriculum = Object.values(CURRICULUM_DATA).flatMap((topics) =>
      Object.entries(topics).flatMap(([topic, subtopics]) => [topic, ...subtopics]),
    );
    const values = [
      ...curriculum,
      ...PREP_LEVELS,
      ...PROBLEM_FORMATS,
      ...SCAFFOLDING_LEVELS,
      ...OUTPUT_INCLUDES,
      ...DISPLAY_OPTIONS,
      ...DIFFICULTIES.map((d) => d.value),
    ];
    for (const value of values) expect(Object.hasOwn(fr, value), value).toBe(true);
  });
  it('keeps unknown domain labels unchanged', () => {
    expect(translateLabel('fr', 'A teacher supplied topic')).toBe('A teacher supplied topic');
  });
});
