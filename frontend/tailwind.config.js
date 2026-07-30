/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Negro elegante
        ink: {
          950: '#0B0D0F',
          900: '#12151A',
          800: '#1C2027',
          700: '#2A2F38',
        },
        // Grises suaves
        mist: {
          50: '#FAFAF9',
          100: '#F4F4F3',
          200: '#E8E8E6',
          300: '#D4D4D1',
          400: '#A8A8A3',
          500: '#7C7C77',
          600: '#635F5A',
          700: '#4A4744',
        },
        // Azul petróleo (acento principal)
        petrol: {
          50: '#EAF3F3',
          100: '#CFE4E4',
          200: '#AAD0D0',
          300: '#7FB8B8',
          400: '#57A0A0',
          500: '#2E6E6E',
          600: '#245959',
          700: '#1B4444',
          800: '#153535',
          900: '#0F2626',
        },
        // Dorado discreto (acento secundario)
        gold: {
          50: '#FBF6EB',
          100: '#F6EBD3',
          200: '#F1E4C3',
          300: '#E5CD96',
          400: '#D4B36A',
          500: '#C29B4B',
          600: '#A67F38',
          700: '#84652C',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Manrope"', '"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(18, 21, 26, 0.06), 0 1px 2px rgba(18, 21, 26, 0.04)',
        card: '0 8px 24px -8px rgba(18, 21, 26, 0.10)',
        lift: '0 16px 40px -12px rgba(18, 21, 26, 0.16)',
      },
    },
  },
  plugins: [],
};
