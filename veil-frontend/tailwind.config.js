/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        veil: {
          cream: '#F7F2EC',
          paper: '#FCF9F5',
          border: '#E6DDD3',
          ink: '#231F20',
          umber: '#5F4E4A',
          olive: '#858461',
          taupe: '#8A6674',
          plum: '#5E404F',
          rose: '#D6ADAD',
          vanilla: '#F7E6A9',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Cairo', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
