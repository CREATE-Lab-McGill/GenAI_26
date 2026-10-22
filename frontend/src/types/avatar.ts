import { 
  Calculator, 
  Ruler, 
  Compass, 
  PieChart, 
  Sigma, 
  Infinity as InfinityIcon, 
  Divide, 
  Percent, 
  Hexagon, 
  Binary, 
  BarChart2, 
  Box 
} from 'lucide-react';

export const MATH_AVATARS = [
  { id: 'calculator', Icon: Calculator, bg: 'linear-gradient(135deg, #FF9A9E, #FECFEF)', name: 'Calculator' },
  { id: 'ruler', Icon: Ruler, bg: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', name: 'Ruler' },
  { id: 'compass', Icon: Compass, bg: 'linear-gradient(135deg, #84fab0, #8fd3f4)', name: 'Compass' },
  { id: 'piechart', Icon: PieChart, bg: 'linear-gradient(135deg, #fccb90, #d57eeb)', name: 'Chart' },
  { id: 'sigma', Icon: Sigma, bg: 'linear-gradient(135deg, #4facfe, #00f2fe)', name: 'Sigma' },
  { id: 'infinity', Icon: InfinityIcon, bg: 'linear-gradient(135deg, #fa709a, #fee140)', name: 'Infinity' },
  { id: 'divide', Icon: Divide, bg: 'linear-gradient(135deg, #f6d365, #fda085)', name: 'Division' },
  { id: 'percent', Icon: Percent, bg: 'linear-gradient(135deg, #e0c3fc, #8ec5fc)', name: 'Percentage' },
  { id: 'hexagon', Icon: Hexagon, bg: 'linear-gradient(135deg, #5ee7df, #b490ca)', name: 'Hexagon' },
  { id: 'binary', Icon: Binary, bg: 'linear-gradient(135deg, #667eea, #764ba2)', name: 'Binary' },
  { id: 'barchart', Icon: BarChart2, bg: 'linear-gradient(135deg, #89f7fe, #66a6ff)', name: 'Statistics' },
  { id: 'box', Icon: Box, bg: 'linear-gradient(135deg, #96fbc4, #f9f586)', name: '3D Geometry' },
];