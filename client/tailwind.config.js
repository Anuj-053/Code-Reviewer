/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d1117',
        surface: '#161b22',
        'surface-2': '#1c2128',
        border: '#30363d',
        'border-muted': '#21262d',
        text: '#e6edf3',
        'text-muted': '#8b949e',
        accent: '#58a6ff',
        'accent-hover': '#79b8ff',
        bug: '#f85149',
        security: '#ff7b72',
        performance: '#e3b341',
        style: '#58a6ff',
        suggestion: '#8b949e',
        success: '#3fb950',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
