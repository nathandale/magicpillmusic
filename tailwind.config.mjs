/** @type {import('tailwindcss').Config} */
const config = {
  theme: {
    extend: {
      colors: {
        void: '#000000',
        red: '#ff0000',
        yellow: '#ffee00',
        acid: '#ccff00',
      },
      fontFamily: {
        bangers: ['Bangers', 'cursive'],
        vt323: ['VT323', 'monospace'],
        bhs: ['Black Han Sans', 'sans-serif'],
      },
      typography: () => ({
        DEFAULT: {
          css: [
            {
              '--tw-prose-body': 'var(--text)',
              '--tw-prose-headings': 'var(--text)',
              h1: {
                fontWeight: 'normal',
                marginBottom: '0.25em',
              },
            },
          ],
        },
        base: {
          css: [
            {
              h1: {
                fontSize: '2.5rem',
              },
              h2: {
                fontSize: '1.25rem',
                fontWeight: 600,
              },
            },
          ],
        },
        md: {
          css: [
            {
              h1: {
                fontSize: '3.5rem',
              },
              h2: {
                fontSize: '1.5rem',
              },
            },
          ],
        },
      }),
    },
  },
}

export default config
