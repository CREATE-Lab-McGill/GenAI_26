import { initialGeneratorForm, type GeneratedSet } from '../src/types/problem';

export const sampleSet: GeneratedSet = {
  id: 'set-1',
  name: 'My original worksheet',
  topic: 'Statistics',
  prepLevel: 'Sec III',
  createdAt: '2026-10-18T15:00:00Z',
  isSaved: true,
  formData: {
    ...initialGeneratorForm,
    setName: 'My original worksheet',
    mainTopic: 'Statistics',
    subtopic: 'Measures of central tendency: mode, median, weighted mean',
    outputIncludes: ['Instructions', 'Answer key', 'Worked solutions', 'Hints', 'Teacher tip'],
  },
  questions: [
    {
      id: 'question-1',
      prompt: 'Find the mean of $2, 4, 6$.',
      answer: '$4$',
      solution: 'Add the numbers and divide by three.',
      hint: 'Use the arithmetic mean.',
      teacherTip: 'Ask students to explain their reasoning.',
      topic: 'Statistics',
      difficulty: 'Medium',
      prepLevel: 'Sec III',
    },
  ],
};
