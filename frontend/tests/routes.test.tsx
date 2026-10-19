import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import LanguageProvider from '../src/i18n/LanguageProvider';
import { LANGUAGE_KEY } from '../src/i18n/language';
import browserRouter from '../src/routes/Routes';
import * as api from '../src/api/client';
import { sampleSet } from './fixtures';

vi.mock('mathlive', () => ({}));
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));
vi.mock('../src/components/GraphCanvas', () => ({
  GraphCanvas: () => <div>graph</div>,
}));
vi.mock('../src/api/client', () => ({
  getSets: vi.fn(),
  generateSet: vi.fn(),
  submitFeedback: vi.fn(),
  deleteSet: vi.fn(),
  editQuestionWithAi: vi.fn(),
  editSetWithAi: vi.fn(),
  saveSet: vi.fn(),
  deleteQuestion: vi.fn(),
  updateQuestionManual: vi.fn(),
  generateAlternativeQuestion: vi.fn(),
  exportWordDocument: vi.fn(),
  reorderQuestions: vi.fn(),
  duplicateSet: vi.fn(),
  updateQuestionTip: vi.fn(),
  updateQuestionOverrides: vi.fn(),
  updateSetSettings: vi.fn(),
}));

beforeEach(() => {
  localStorage.setItem('mathcraft_tutorial_seen_app_intro_v1', 'true');
  localStorage.setItem('mathcraft_last_generated_set', JSON.stringify(sampleSet));
  vi.mocked(api.getSets).mockResolvedValue([sampleSet]);
  vi.mocked(api.generateSet).mockResolvedValue(sampleSet);
});

function renderRoute(path: string) {
  const router = createMemoryRouter(browserRouter.routes, {
    initialEntries: [path],
  });
  const view = render(
    <LanguageProvider>
      <RouterProvider router={router} />
    </LanguageProvider>,
  );
  return { ...view, router };
}

const routes = [
  ['/', 'How it works', 'Comment ça fonctionne'],
  ['/dashboard', 'Recent activity', 'Activité récente'],
  ['/generate', 'Create problem set', 'Créer une série de problèmes'],
  ['/generate-situational', 'Create problem set', 'Créer une série de problèmes'],
  ['/results', 'Generated set', 'Série générée'],
  ['/account', 'Prep profiles', 'Profils de classe'],
];

describe('all routes', () => {
  it.each(routes)('%s switches English → French → English without mutations', async (path, english, french) => {
    renderRoute(path);
    expect((await screen.findAllByText(english)).length).toBeGreaterThan(0);
    const reads = vi.mocked(api.getSets).mock.calls.length;
    const stored = localStorage.getItem('mathcraft_last_generated_set');
    await userEvent.click(screen.getByRole('button', { name: 'Français' }));
    expect(screen.getAllByText(french).length).toBeGreaterThan(0);
    expect(vi.mocked(api.getSets).mock.calls.length).toBe(reads);
    expect(api.generateSet).not.toHaveBeenCalled();
    expect(api.saveSet).not.toHaveBeenCalled();
    expect(api.updateSetSettings).not.toHaveBeenCalled();
    expect(localStorage.getItem('mathcraft_last_generated_set')).toBe(stored);
    await userEvent.click(screen.getByRole('button', { name: 'Français' }));
    expect(screen.getAllByText(english).length).toBeGreaterThan(0);
  });
  it.each(routes)('%s restores French on a direct visit', async (path, _english, french) => {
    localStorage.setItem(LANGUAGE_KEY, 'fr');
    renderRoute(path);
    expect((await screen.findAllByText(french)).length).toBeGreaterThan(0);
    expect(document.documentElement.lang).toBe('fr');
  });
  it('keeps French when navigating between pages', async () => {
    renderRoute('/dashboard');
    await userEvent.click(screen.getByRole('button', { name: 'Français' }));
    await userEvent.click(screen.getByRole('button', { name: /Voir les séries enregistrées/ }));
    expect(await screen.findByText('Profils de classe')).toBeTruthy();
    expect(document.documentElement.lang).toBe('fr');
  });
  it('also provides the toggle on the empty results page', async () => {
    localStorage.removeItem('mathcraft_last_generated_set');
    renderRoute('/results');
    await userEvent.click(screen.getByRole('button', { name: 'Français' }));
    expect(screen.getByRole('heading', { name: 'Aucune série à afficher' })).toBeTruthy();
  });
});

it.each(['/generate', '/generate-situational'])(
  '%s preserves drafts, steps, defaults, and canonical generation payloads',
  async (path) => {
    const user = userEvent.setup();
    renderRoute(path);
    const name = screen.getByPlaceholderText('e.g., Pop Quiz: Hockey & Interest Rates');
    await user.type(name, 'Save'); // This intentionally matches a message key: user text must not translate.
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[1], 'Statistics');
    await user.selectOptions(selects[2], sampleSet.formData.subtopic);
    await user.click(screen.getByRole('button', { name: 'Français' }));
    expect((name as HTMLInputElement).value).toBe('Save');
    expect((selects[1] as HTMLSelectElement).value).toBe('Statistics');
    expect(within(selects[1]).getByRole('option', { name: 'Statistiques' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    expect(screen.getByText('Étape 2 sur 4')).toBeTruthy();
    const format = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    expect(format.value).toBe('Word Problem');
    expect(format.selectedOptions[0].textContent).toBe('Problème écrit');
    await user.click(screen.getByRole('button', { name: 'Français' }));
    expect(screen.getByText('Step 2 of 4')).toBeTruthy();
    expect(format.value).toBe('Word Problem');
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(screen.getByRole('button', { name: 'Save as default' }));
    const defaultsKey = path === '/generate' ? 'mathcraft_generator_defaults' : 'mathcraft_situational_defaults';
    expect(JSON.parse(localStorage.getItem(defaultsKey)!).outputIncludes).toEqual([
      'Instructions',
      'Answer key',
      'Teacher tip',
    ]);
    await user.click(screen.getByRole('button', { name: 'Français' }));
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    expect(screen.getByText('5 questions')).toBeTruthy();
    expect(screen.getAllByText('Moyen').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /Générer les problèmes/ }));
    expect(api.generateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        setName: 'Save',
        prepLevel: 'Sec III',
        topic: `Statistics: ${sampleSet.formData.subtopic}`,
        formData: expect.objectContaining({
          mainTopic: 'Statistics',
          scaffolding: ['Hints'],
          questionGroups: [
            expect.objectContaining({
              format: 'Word Problem',
              difficulty: 'Medium',
            }),
          ],
        }),
      }),
    );
  },
);

it('keeps original generated prose and unsaved manual edits while toggling results', async () => {
  const user = userEvent.setup();
  renderRoute('/results');
  await user.click(await screen.findByRole('button', { name: 'Edit text' }));
  const editor = screen.getByPlaceholderText('Write your question here...') as HTMLTextAreaElement;
  await user.clear(editor);
  await user.type(editor, 'Save my unsaved English edit');
  await user.click(screen.getByRole('button', { name: 'Français' }));
  expect(editor.value).toBe('Save my unsaved English edit');
  expect(screen.getByRole('button', { name: 'Enregistrer le texte seulement' })).toBeTruthy();
  expect(api.updateQuestionManual).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Annuler' }));
  expect(screen.getByText('Use the arithmetic mean.')).toBeTruthy();
  expect(screen.getByText('Ask students to explain their reasoning.')).toBeTruthy();
  expect(
    screen.getByText('Consignes : Résolvez les problèmes suivants en montrant toutes vos démarches.'),
  ).toBeTruthy();
});

it('switches inside the first-run tutorial without resetting its current slide', async () => {
  localStorage.removeItem('mathcraft_tutorial_seen_app_intro_v1');
  renderRoute('/');
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  await userEvent.click(screen.getAllByRole('button', { name: 'Français' })[1]);
  expect(screen.getByRole('heading', { name: 'Votre centre de contrôle' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Passer la visite' }));
  expect(localStorage.getItem('mathcraft_tutorial_seen_app_intro_v1')).toBe('true');
});

it('keeps the first-run landing page usable when browser storage is blocked', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  renderRoute('/');
  await userEvent.click(screen.getAllByRole('button', { name: 'Français' })[1]);
  expect(screen.getByRole('heading', { name: 'Bienvenue dans MathCraft' })).toBeTruthy();
});

it('submits feedback with the original comment and canonical rating after switching', async () => {
  vi.mocked(api.submitFeedback).mockResolvedValue({
    id: 'feedback-1',
    page: '/dashboard',
    createdAt: '2026-10-18T15:00:00Z',
    message: 'Original comment',
    rating: 'positive',
  });
  renderRoute('/dashboard');
  await userEvent.click(screen.getByRole('button', { name: 'Give feedback' }));
  const comment = screen.getByPlaceholderText("Anything you'd like to share? (optional)") as HTMLTextAreaElement;
  await userEvent.type(comment, 'Original comment');
  await userEvent.click(screen.getByRole('button', { name: 'Positive feedback' }));
  await userEvent.click(screen.getByRole('button', { name: 'Français' }));
  expect(comment.value).toBe('Original comment');
  await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
  expect(api.submitFeedback).toHaveBeenCalledWith({
    message: 'Original comment',
    rating: 'positive',
    section: undefined,
    metadata: undefined,
  });
  expect(screen.getByText('Merci pour vos commentaires!')).toBeTruthy();
});

it('keeps canonical output settings when selecting translated options', async () => {
  vi.mocked(api.updateSetSettings).mockResolvedValue(sampleSet);
  renderRoute('/results');
  await userEvent.click(await screen.findByRole('button', { name: 'Français' }));
  await userEvent.click(screen.getByRole('button', { name: 'Options ▾' }));
  await userEvent.click(screen.getByRole('button', { name: 'Réglages de présentation' }));
  await userEvent.click(screen.getByRole('checkbox', { name: /Indices/ }));
  expect(api.updateSetSettings).toHaveBeenCalledWith(
    'set-1',
    expect.objectContaining({
      outputIncludes: ['Instructions', 'Answer key', 'Worked solutions', 'Teacher tip'],
    }),
  );
  expect(JSON.parse(localStorage.getItem('mathcraft_last_generated_set')!).formData.outputIncludes).not.toContain(
    'Hints',
  );
});

it('localizes default class names but preserves a teacher-edited name', async () => {
  renderRoute('/account');
  const input = screen.getByRole('textbox', { name: 'Prep name' }) as HTMLInputElement;
  await userEvent.click(screen.getByRole('button', { name: 'Français' }));
  expect(input.value).toBe('Classe 1');
  await userEvent.clear(input);
  await userEvent.type(input, 'Save');
  await userEvent.click(screen.getByRole('button', { name: 'Français' }));
  expect(input.value).toBe('Save');
});

it('exports Word with original content and no interface-language field', async () => {
  vi.mocked(api.exportWordDocument).mockResolvedValue(new Blob(['test document']));
  renderRoute('/results');
  await userEvent.click(await screen.findByRole('button', { name: 'Français' }));
  await userEvent.click(screen.getByRole('button', { name: 'Options ▾' }));
  await userEvent.click(screen.getByRole('button', { name: 'Exporter la fiche de l’élève (Word)' }));
  expect(api.exportWordDocument).toHaveBeenCalledWith({
    name: sampleSet.name,
    questions: sampleSet.questions,
    mode: 'student',
    graphImages: {},
  });
});
