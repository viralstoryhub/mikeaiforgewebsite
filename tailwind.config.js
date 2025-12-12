/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'dark-primary': '#0D0D0D',
        'dark-secondary': '#1A1A1A',
        'border-dark': '#2A2A2A',
        'brand-primary': '#4389FF',
        'brand-secondary': '#6E56CF',
        'light-primary': '#F5F5F5',
        'light-secondary': '#A3A3A3',
        'light-tertiary': '#737373',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(67, 137, 255, 0.3)',
      },
    },
  },
  plugins: [],
};
