/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": "#072a17",
        "primary-container": "#1f402b",
        "on-primary": "#ffffff",
        "on-primary-container": "#87ac90",
        "primary-fixed": "#c6ecce",
        "primary-fixed-dim": "#aad0b3",
        "on-primary-fixed": "#00210f",
        "on-primary-fixed-variant": "#2d4e38",
        "inverse-primary": "#aad0b3",
        
        "secondary": "#45664b",
        "secondary-container": "#c4e9c7",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#4a6a4f",
        "secondary-fixed": "#c7ecca",
        "secondary-fixed-dim": "#abd0af",
        "on-secondary-fixed": "#02210c",
        "on-secondary-fixed-variant": "#2e4e35",

        "tertiary": "#755b00",
        "tertiary-container": "#cea72c",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#4f3d00",
        "tertiary-fixed": "#ffe08e",
        "tertiary-fixed-dim": "#ecc246",
        "on-tertiary-fixed": "#241a00",
        "on-tertiary-fixed-variant": "#584400",

        "background": "#fdf9ef",
        "on-background": "#1c1c16",

        "surface": "#fdf9ef",
        "on-surface": "#1c1c16",
        "surface-variant": "#e6e2d8",
        "on-surface-variant": "#424842",
        "surface-bright": "#fdf9ef",
        "surface-dim": "#dddad0",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f7f3e9",
        "surface-container": "#f1eee3",
        "surface-container-high": "#ebe8de",
        "surface-container-highest": "#e6e2d8",
        "surface-tint": "#44664e",
        "inverse-surface": "#31312a",
        "inverse-on-surface": "#f4f1e6",

        "outline": "#727972",
        "outline-variant": "#c2c8c0",

        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        '2xl': '1.25rem',
      },
      spacing: {
        'stack-sm': '8px',
        'stack-md': '16px',
        'stack-lg': '32px',
        'gutter': '24px',
        'container-max': '1280px',
        'margin-mobile': '16px',
        'margin-desktop': '40px',
      }
    },
  },
  plugins: [],
}
