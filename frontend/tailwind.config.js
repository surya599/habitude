/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Inter"',
          '"Geist"',
          'system-ui',
          'sans-serif',
        ],
        serif: [
          '"New York"',
          'Georgia',
          'Cambria',
          '"Times New Roman"',
          'serif',
        ],
        mono: [
          '"SF Mono"',
          '"JetBrains Mono"',
          'Menlo',
          'monospace',
        ],
      },
      colors: {
        background: 'var(--bg-primary)',
        surface: 'var(--bg-card)',
        'surface-secondary': 'var(--bg-secondary)',
        'surface-elevated': 'var(--bg-elevated)',
        foreground: 'var(--text-primary)',
        muted: 'var(--text-secondary)',
        subtle: 'var(--text-tertiary)',
        border: 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
        },
        success: {
          DEFAULT: 'var(--status-success)',
          soft: 'var(--status-success-soft)',
        },
        warning: {
          DEFAULT: 'var(--status-warning)',
          soft: 'var(--status-warning-soft)',
        },
        danger: {
          DEFAULT: 'var(--status-danger)',
          soft: 'var(--status-danger-soft)',
        },
      },
      boxShadow: {
        apple: 'var(--shadow-card)',
        'apple-lg': 'var(--shadow-elevated)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.375rem',
      },
    },
  },
  plugins: [],
};
