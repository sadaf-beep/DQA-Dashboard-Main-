/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './*.tsx', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design system tokens - see SECURITY.md's neighbor, the design
        // handoff README, for the source palette. Anything not named here
        // (one-off borders/tints) uses Tailwind arbitrary values instead of
        // growing this list indefinitely.
        accent: '#3d7bfa',
        bg: '#f3f5f8',
        surface: '#ffffff',
        sidebar: '#0e1526',
        ink: {
          DEFAULT: '#151b2c',
          secondary: '#5a637c',
          muted: '#8b95ad',
        },
        success: { DEFAULT: '#1fa872', text: '#0e9469', bg: '#e0f7ee' },
        warning: { DEFAULT: '#e0b95a', text: '#a3791f', bg: '#fbf1dc' },
        danger: { DEFAULT: '#e5484d', text: '#c22b3b', bg: '#fdecec' },
        purple: { DEFAULT: '#7c3aed', bg: '#f0e8fd' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        card: '14px',
        chip: '6px',
      },
    },
  },
  plugins: [],
};
