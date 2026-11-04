import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percentage,
  size = 188,
  strokeWidth = 14,
  label = 'Daily Progress',
  sublabel,
  color,
}) => {
  const { chartTheme } = useTheme();
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const activeColor = color || (clamped >= 100 ? chartTheme.success : chartTheme.primary);

  return (
    <div
      className="relative inline-flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90 transform">
        {/* Track Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={chartTheme.ringTrack}
          strokeWidth={strokeWidth}
        />
        {/* Animated Foreground Ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ type: 'spring', stiffness: 75, damping: 18 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <motion.span
          key={Math.round(clamped)}
          initial={{ scale: 0.92, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground tabular-nums"
        >
          {Math.round(clamped)}%
        </motion.span>
        {label && (
          <span className="text-xs font-medium text-muted mt-1 tracking-wide uppercase">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-[11px] text-subtle mt-0.5">{sublabel}</span>
        )}
      </div>
    </div>
  );
};
