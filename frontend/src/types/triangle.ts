import type { TriangleConfig } from '../types/problem';

export const isValidTriangle = ({ a, b, c }: Pick<TriangleConfig, 'a' | 'b' | 'c'>) =>
  a > 0 && b > 0 && c > 0 && a + b > c && a + c > b && b + c > a;


