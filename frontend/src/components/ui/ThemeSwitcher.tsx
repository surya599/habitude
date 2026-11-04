import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ThemePreference } from '../../types';

interface ThemeSwitcherProps {
  compact?: boolean;
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  compact = false,
  className = '',
}) => {
  const { theme, setTheme } = useTheme();

  const options: Array<{
    value: ThemePreference;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl bg-surface-secondary border border-border ${className}`}
      role="group"
      aria-label="Theme preference"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            title={`${opt.label} theme`}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              isActive
                ? 'bg-surface text-foreground shadow-sm border border-border/70'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
