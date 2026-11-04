import React from 'react';
import {
  Activity,
  Award,
  BookMarked,
  BookOpen,
  Brain,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Coffee,
  Compass,
  Droplets,
  Dumbbell,
  Feather,
  Flame,
  Heart,
  Layers,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Wallet,
  Zap,
  LucideProps,
} from 'lucide-react';

export const ICON_COMPONENTS: Record<string, React.FC<LucideProps>> = {
  Activity,
  Award,
  BookMarked,
  BookOpen,
  Brain,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Coffee,
  Compass,
  Droplets,
  Dumbbell,
  Feather,
  Flame,
  Heart,
  Layers,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Wallet,
  Zap,
};

export const AVAILABLE_HABIT_ICONS: string[] = [
  'Sparkles',
  'BookOpen',
  'Dumbbell',
  'Droplets',
  'Zap',
  'Moon',
  'Heart',
  'Briefcase',
  'Compass',
  'Wallet',
  'Brain',
  'Target',
  'Sun',
  'Coffee',
  'Feather',
  'CheckCircle2',
];

export const AVAILABLE_COLORS: string[] = [
  '#0066CC',
  '#28A745',
  '#5856D6',
  '#AF52DE',
  '#FF9500',
  '#30B0C7',
  '#E03131',
  '#0CA678',
];

interface DynamicIconProps extends LucideProps {
  name: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, ...props }) => {
  const IconComp = ICON_COMPONENTS[name] || CheckCircle2;
  return <IconComp {...props} />;
};
