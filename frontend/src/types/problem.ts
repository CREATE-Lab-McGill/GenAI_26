export type PrepLevel =
  | 'Sec I'
  | 'Sec II'
  | 'Sec III'
  | 'Sec IV'
  | 'Sec V';

export const PREP_LEVELS: PrepLevel[] = [
  'Sec I',
  'Sec II',
  'Sec III',
  'Sec IV',
  'Sec V',
];

export type ProblemFormat = 'Word Problem' | 'Multiple Choice' | 'Short Answer' | 'Situational (SIT)';

export const PROBLEM_FORMATS: ProblemFormat[] = [
  'Word Problem',
  'Multiple Choice',
  'Short Answer',
  'Situational (SIT)',
];

export type Difficulty = 'Remediation' | 'Easy' | 'Medium' | 'Hard' | 'Extension';

export const DIFFICULTIES: { value: Difficulty; helper: string }[] = [
  { value: 'Remediation', helper: 'Below-grade review and skill building.' },
  { value: 'Easy', helper: 'Simple grade-level practice.' },
  { value: 'Medium', helper: 'Balanced grade-level practice.' },
  { value: 'Hard', helper: 'More challenging grade-level problems.' },
  { value: 'Extension', helper: 'Above-grade enrichment and challenge.' },
];

export type ScaffoldingLevel = 'None' | 'Hints' | 'Prompting' | 'Worked Example' | 'Skeletal Frame';

export const SCAFFOLDING_LEVELS: ScaffoldingLevel[] = [
  'None',
  'Hints',
  'Prompting',
  'Worked Example',
  'Skeletal Frame',
];

export interface ProblemTypeCount {
  format: ProblemFormat;
  count: number;
}

export type OutputInclude = 'Instructions' | 'Answer key' | 'Worked solutions' | 'Hints' | 'Scratch space';

export const OUTPUT_INCLUDES: OutputInclude[] = [
  'Instructions',
  'Answer key',
  'Worked solutions',
  'Hints',
  'Scratch space',
];

export type DisplayOption = 'Answer space' | 'Extra room for solution' | 'Graph / diagram space' | 'Difficulty tag';

export const DISPLAY_OPTIONS: DisplayOption[] = [
  'Answer space',
  'Extra room for solution',
  'Graph / diagram space',
  'Difficulty tag',
];

export type QuestionOrder = 'By topic' | 'By difficulty' | 'Mixed' | 'Random';
export type GroupBy = 'None' | 'Topic' | 'Difficulty' | 'Format';

export interface GeneratorFormData {
  learningStandard: string;
  topic: string;
  problemFormats: ProblemFormat[];
  realWorldContext: string;

  difficulty: Difficulty;
  dok: '1' | '2' | '3' | '4';
  scaffolding: ScaffoldingLevel[];
  customRules: string;
  problemTypeCounts: ProblemTypeCount[];

  outputIncludes: OutputInclude[];
  displayOptions: DisplayOption[];
  questionOrder: QuestionOrder;
  groupBy: GroupBy;
}

export const initialGeneratorForm: GeneratorFormData = {
  learningStandard: '',
  topic: '',
  problemFormats: ['Word Problem'],
  realWorldContext: '',

  difficulty: 'Medium',
  dok: '2',
  scaffolding: ['Hints'],
  customRules: '',
  problemTypeCounts: [
    { format: 'Word Problem', count: 5 },
    { format: 'Multiple Choice', count: 0 },
    { format: 'Short Answer', count: 0 },
    { format: 'Situational (SIT)', count: 0 },
  ],

  outputIncludes: ['Instructions', 'Answer key'],
  displayOptions: ['Answer space', 'Difficulty tag'],
  questionOrder: 'By topic',
  groupBy: 'None',
};

export interface GeneratedQuestion {
  id: string;
  prompt: string;
  format: ProblemFormat;
  currTag: string;
  prepTag: PrepLevel;
  difficultyTag: Difficulty;
  answer?: string;
  solution?: string;
  hint?: string;
}

export interface GeneratedSet {
  id: string;
  topic: string;
  createdAt: string;
  prepLevel: PrepLevel;
  formData: GeneratorFormData;
  questions: GeneratedQuestion[];
  name?: string;
}

export interface TeacherProfile {
  name: string;
  email: string;
  school: string;
  prepLevels: PrepLevel[];
  subjects: string[];
  defaultLanguage: 'English' | 'French' | 'Spanish';
  savedDefaults: Partial<GeneratorFormData> | null;
}