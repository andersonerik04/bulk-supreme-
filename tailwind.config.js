/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic surface tokens driven by CSS variables (see index.css)
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        // One accent per domain
        weight: 'rgb(var(--weight) / <alpha-value>)',
        food: 'rgb(var(--food) / <alpha-value>)',
        water: 'rgb(var(--water) / <alpha-value>)',
        protein: 'rgb(var(--protein) / <alpha-value>)',
        carbs: 'rgb(var(--carbs) / <alpha-value>)',
        fat: 'rgb(var(--fat) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        pop: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(0.92)' }, '100%': { transform: 'scale(1)' } },
        wave: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        'fade-up': 'fade-up 420ms cubic-bezier(.2,.8,.2,1) both',
        'sheet-up': 'sheet-up 340ms cubic-bezier(.2,.9,.25,1) both',
        'fade-in': 'fade-in 240ms ease-out both',
        pop: 'pop 260ms ease-out',
        wave: 'wave 4s linear infinite',
      },
    },
  },
  plugins: [],
};
