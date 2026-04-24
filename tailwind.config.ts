import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6B1A1A',
          hover: '#8B2020',
          dark: '#4A1010',
        },
        accent: '#A0522D',
        bg: '#FAF8F5',
        surface: '#F5EFE6',
        text: {
          DEFAULT: '#2C2C2C',
          light: '#555555',
        },
        border: '#D4C5B0',
        status: {
          open: '#555555',
          pix: '#6B1A1A',
          preparing: '#B8860B',
          delivery: '#1F6FB2',
          delivered: '#2F7D32',
          cancelled: '#8B0000',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        btn: '6px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(44,44,44,0.04), 0 1px 3px rgba(44,44,44,0.06)',
      },
    },
  },
  plugins: [],
}
