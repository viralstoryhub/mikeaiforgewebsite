/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware colors using CSS variables
        'dark-primary': 'var(--bg-primary)',
        'dark-secondary': 'var(--bg-secondary)',
        'dark-tertiary': 'var(--bg-tertiary)',
        'border-dark': 'var(--border-color)',
        'brand-primary': 'var(--accent-primary)',
        'brand-secondary': 'var(--accent-secondary)',
        'light-primary': 'var(--text-primary)',
        'light-secondary': 'var(--text-secondary)',
        'light-tertiary': 'var(--text-tertiary)',
      },
      boxShadow: {
        'glow-blue': '0 0 20px var(--glow-color)',
      },
      backgroundColor: {
        'theme-primary': 'var(--bg-primary)',
        'theme-secondary': 'var(--bg-secondary)',
        'theme-tertiary': 'var(--bg-tertiary)',
      },
      textColor: {
        'theme-primary': 'var(--text-primary)',
        'theme-secondary': 'var(--text-secondary)',
        'theme-tertiary': 'var(--text-tertiary)',
      },
      borderColor: {
        'theme': 'var(--border-color)',
      },
    },
  },
  plugins: [],
};
