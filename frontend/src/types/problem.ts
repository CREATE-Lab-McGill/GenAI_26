export type PrepLevel =
  | 'Sec I'
  | 'Sec II'
  | 'Sec III'
  | 'Sec IV (CST)'
  | 'Sec IV (TS)'
  | 'Sec IV (SN)'
  | 'Sec V (CST)'
  | 'Sec V (TS)'
  | 'Sec V (SN)';

export const PREP_LEVELS: PrepLevel[] = [
  'Sec I',
  'Sec II',
  'Sec III',
  'Sec IV (CST)',
  'Sec IV (TS)',
  'Sec IV (SN)',
  'Sec V (CST)',
  'Sec V (TS)',
  'Sec V (SN)',
];

export type ProblemFormat = 'Word Problem' | 'Multiple Choice' | 'Short Answer' | 'Situational (SIT)';

export const PROBLEM_FORMATS: ProblemFormat[] = [
  'Word Problem',
  'Multiple Choice',
  'Short Answer',
  'Situational (SIT)',
];

export type Difficulty = 'Remediation' | 'Easy' | 'Medium' | 'Hard' | 'Extension' | 'Mixed';

export const DIFFICULTIES: { value: Difficulty; helper: string }[] = [
  { value: 'Remediation', helper: 'Below-grade review and skill building.' },
  { value: 'Easy', helper: 'Simple grade-level practice.' },
  { value: 'Medium', helper: 'Balanced grade-level practice.' },
  { value: 'Hard', helper: 'More challenging grade-level problems.' },
  { value: 'Extension', helper: 'Above-grade enrichment and challenge.' },
  { value: 'Mixed', helper: 'A balanced mix of all difficulty levels.' },
];

export type ScaffoldingLevel = 'None' | 'Hints' | 'Prompting' | 'Worked Example' | 'Skeletal Frame';

export const SCAFFOLDING_LEVELS: ScaffoldingLevel[] = [
  'None',
  'Hints',
  'Prompting',
  'Worked Example',
  'Skeletal Frame',
];

export interface QuestionGroup {
  id: string;
  count: number;
  format: ProblemFormat;
  difficulty: Difficulty;
}

export type OutputInclude = 'Instructions' | 'Answer key' | 'Worked solutions' | 'Hints';

export const OUTPUT_INCLUDES: OutputInclude[] = [
  'Instructions',
  'Answer key',
  'Worked solutions',
  'Hints',
];

export type DisplayOption = 'Answer space' | 'Extra room for solution' | 'Graph / diagram space' | 'Difficulty tag';

export const DISPLAY_OPTIONS: DisplayOption[] = [
  'Answer space',
  'Graph / diagram space',
  'Difficulty tag',
];

export type QuestionOrder = 'By topic' | 'By difficulty' | 'Mixed' | 'Random';
export type GroupBy = 'None' | 'Topic' | 'Difficulty' | 'Format';

export interface GeneratorFormData {
  setName: string;
  mainTopic: string; 
  subtopic: string;
  realWorldContext: string;

  difficulty: Difficulty;
  dok: '1' | '2' | '3' | '4';
  scaffolding: ScaffoldingLevel[];
  customRules: string;
  
  questionGroups: QuestionGroup[];

  outputIncludes: OutputInclude[];
  displayOptions: DisplayOption[];
  questionOrder: QuestionOrder;
  groupBy: GroupBy;
  graphConfig?: GraphConfig;
}

export const initialGeneratorForm: GeneratorFormData = {
  setName: '',
  mainTopic: '',       
  subtopic: '',
  realWorldContext: '',

  difficulty: 'Medium',
  dok: '2',
  scaffolding: ['Hints'],
  customRules: '',
  
  questionGroups: [
    { id: 'group_init_1', count: 5, format: 'Word Problem', difficulty: 'Medium' }
  ],

  outputIncludes: ['Instructions', 'Answer key'],
  displayOptions: ['Answer space', 'Difficulty tag'],
  questionOrder: 'By topic',
  groupBy: 'None',
};

export interface QuestionOutputOverrides {
  outputIncludes?: OutputInclude[];
  displayOptions?: DisplayOption[];
  graphConfig?: GraphConfig;
}

export interface GeneratedQuestion {
  id: string;
  prompt: string;
  answer: string;
  solution: string;
  hint: string;

  format?: ProblemFormat;
  
  topic?: string;
  subtopic?: string;
  prepLevel?: string;
  difficulty?: string;

  outputOverrides?: QuestionOutputOverrides;
}

export interface GeneratedSet {
  id: string;
  name: string;
  topic: string;
  createdAt: string;
  prepLevel: PrepLevel;
  formData: GeneratorFormData;
  questions: GeneratedQuestion[];
  isSaved?: boolean;
  versionOf?: string;
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

export type GraphStyle = 'blank-grid' | 'axes' | 'quadrant1';

export interface GraphConfig {
  size: 'sm' | 'md' | 'lg';
  style: GraphStyle;
  xRange?: [number, number];
  yRange?: [number, number];
  step?: number;       
  showLabels?: boolean;
}

export const GRAPH_SIZE_PX: Record<GraphConfig['size'], number> = {
  sm: 160,
  md: 220,
  lg: 320,
};

export const DEFAULT_GRAPH_CONFIG: GraphConfig = {
  size: 'md',
  style: 'axes',
  xRange: [-10, 10],
  yRange: [-10, 10],
  step: 2,
  showLabels: true,
};