/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Lyra brand colors — dark therapeutic palette
        brand: {
          50: '#F0ECFB',
          100: '#DDD5F6',
          200: '#BBA9ED',
          300: '#9A7DE4',
          400: '#7B55DB',
          500: '#6237C9',  // Primary
          600: '#4E2CA1',
          700: '#3B2179',
          800: '#271651',
          900: '#140B28',
          950: '#0F0A1A',  // Deepest background
        },
        surface: {
          DEFAULT: '#1A1128',
          primary: '#1A1128',
          secondary: '#231838',
          tertiary: '#2D1F48',
        },
        accent: {
          warm: '#E8A87C',    // Warm therapeutic accent
          calm: '#7EC8E3',    // Calming blue
          growth: '#82D9A5',  // Growth/positive green
          alert: '#E87C7C',   // Alert/crisis red
        },
        text: {
          primary: '#F0ECFB',      // Almost white — main content
          secondary: '#BBA9ED',    // Soft lavender — labels, subtitles
          muted: '#6B5E8A',        // Dim — placeholders, hints
          inverse: '#0F0A1A',      // Dark — on light backgrounds
        },
      },
      fontFamily: {
        sans: ['System'],
        heading: ['System'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
