import type {
  GeneratedQuestion,
  PrepLevel,
  TeacherProfile,
} from '../types/problem';

export const MOCK_PROFILE: TeacherProfile = {
  name: 'Temperance Brennan',
  email: 't.brennan@jefferson.edu',
  school: 'Jefferson High School',
  prepLevels: ['Sec III', 'Sec IV'],
  subjects: ['Mathematics', 'Algebra'],
  defaultLanguage: 'English',
  savedDefaults: null,
};

const SAMPLE_STEMS: Record<string, string[]> = {
  default: [
    'A city bus route covers {a} km in {b} minutes. At this rate, how far does the bus travel in one hour?',
    'A recipe calls for {a} cups of flour for every {b} cups of sugar. If a baker uses {c} cups of sugar, how much flour is needed?',
    'A phone plan charges a flat fee of ${a} plus ${b} per gigabyte used. Write an expression for the monthly cost with {c} GB used.',
    'Two similar triangles have a scale factor of {a}:{b}. If the smaller triangle has a side of {c} cm, find the corresponding side on the larger triangle.',
    'A tank drains at a constant rate of {a} litres per minute. If it starts with {b} litres, how long until it is empty?',
  ],
};

function fakeStem(topic: string, seed: number): string {
  const bank = SAMPLE_STEMS.default;
  const template = bank[seed % bank.length];
  const a = 2 + (seed % 6);
  const b = 3 + ((seed * 2) % 7);
  const c = 4 + ((seed * 3) % 9);
  return template.replace('{a}', String(a)).replace('{b}', String(b)).replace('{c}', String(c))
    + ` (${topic || 'general practice'})`;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `q_${Date.now()}_${idCounter}`;
}


export function generateMockQuestion(
  topic: string,
  format: any,
  difficulty: any,
  prepLevel: PrepLevel,
  currTag: string,
): GeneratedQuestion {
  const seed = idCounter;
  
  const mockQ: any = {
    id: nextId(),
    prompt: fakeStem(topic, seed),
    format,
    currTag,
    prepTag: prepLevel,
    difficultyTag: difficulty,
    answer: `≈ ${(seed % 20) + 1}`,
    solution: 'Set up the ratio from the given rate, then solve for the missing quantity by cross-multiplying.',
    hint: 'Start by identifying which two quantities are changing together.',
  };
  
  
  return mockQ as GeneratedQuestion;
}

export function generateMockSet(formData: any, prepLevel: PrepLevel): GeneratedQuestion[] {
  const topicStr = formData.topic || formData.mainTopic || 'General';
  const currTag = topicStr.trim() ? topicStr.trim().split(/\s+/).slice(0, 2).join(' ') : 'General';
  const questions: GeneratedQuestion[] = [];
  
  const loops = formData.problemTypeCounts || formData.questionGroups || [];
  
  loops.forEach(({ format, count }: any) => {
    for (let i = 0; i < count; i += 1) {
      questions.push(generateMockQuestion(topicStr, format, formData.difficulty, prepLevel, currTag));
    }
  });
  return questions;
}

export interface RecentActivityItem {
  id: string;
  name: string;
  topic: string;
  prepLevel: PrepLevel;
  createdAt: string;
  questionCount: number;
}

export const MOCK_RECENT_ACTIVITY: RecentActivityItem[] = [
  {
    id: 'set_1',
    name: 'Ratios (Tuesday warm-up)',
    topic: 'Proportional relationships',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    prepLevel: 'Sec III',
    questionCount: 8,
  },
  {
    id: 'set_2',
    name: 'Slope-intercept practice',
    topic: 'Linear equations',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    prepLevel: 'Sec IV',
    questionCount: 5,
  },
  {
    id: 'set_3',
    name: 'DOK 3 challenge set',
    topic: 'Similar triangles',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    prepLevel: 'Sec III',
    questionCount: 6,
  },
];