import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        /* ── Material You — Botanical Eco Green ── */
        primary:                '#1b6d24',
        'on-primary':           '#ffffff',
        'primary-container':    '#a8f499',
        'on-primary-container': '#002204',

        secondary:                '#506352',
        'on-secondary':           '#ffffff',
        'secondary-container':    '#d3e8d2',
        'on-secondary-container': '#0e1f12',

        tertiary:                '#39656b',
        'on-tertiary':           '#ffffff',
        'tertiary-container':    '#bcebf2',
        'on-tertiary-container': '#001f23',

        error:                '#ba1a1a',
        'on-error':           '#ffffff',
        'error-container':    '#ffdad6',
        'on-error-container': '#410002',

        surface:                     '#f8faf6',
        'surface-dim':               '#d8dbd4',
        'surface-bright':            '#f8faf6',
        'surface-container-lowest':  '#ffffff',
        'surface-container-low':     '#f2f5ee',
        'surface-container':         '#eef1ec',
        'surface-container-high':    '#e7eae3',
        'surface-container-highest': '#e1e4de',

        'on-surface':         '#191c19',
        'on-surface-variant':  '#414941',
        'inverse-surface':     '#2e312e',
        'inverse-on-surface':  '#eff2eb',

        outline:         '#717971',
        'outline-variant': '#c1c9bf',

        /* ── Legacy (backward-compatible) ── */
        ink:  '#191c19',
        oil:  '#1b6d24',
        sand: '#f8faf6',
      },
      fontFamily: {
        sans:    ['"Google Sans Text"', '"Roboto Flex"', 'Roboto', 'system-ui', 'sans-serif'],
        display: ['"Google Sans"', '"Google Sans Text"', 'system-ui', 'sans-serif'],
        body:    ['"Google Sans Text"', '"Roboto Flex"', 'Roboto', 'system-ui', 'sans-serif'],
        mono:    ['"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '28px',
      },
      boxShadow: {
        'm3-1': '0 1px 3px 1px rgba(0,0,0,.15), 0 1px 2px 0 rgba(0,0,0,.3)',
        'm3-2': '0 2px 6px 2px rgba(0,0,0,.15), 0 1px 2px 0 rgba(0,0,0,.3)',
      },
    },
  },
  plugins: [],
};

export default config;
