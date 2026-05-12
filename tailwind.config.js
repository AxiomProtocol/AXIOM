export default {
  content: [
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        dl: {
          navy: '#1e3a5f',
          'navy-light': '#2a4a73',
          forest: '#2d5016',
          gold: '#b8860b',
          'gold-muted': '#c9a84c',
          gray: '#6b7280',
          'gray-light': '#9ca3af',
          bg: '#ffffff',
          'bg-alt': '#fafaf8',
          border: '#d1d5db',
          'border-light': '#e5e7eb',
          error: '#991b1b',
        },
      },
      fontFamily: {
        'dl-serif': ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        'dl-mono': ['"Courier New"', 'Courier', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: []
}
