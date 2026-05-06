import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary:        "#254b86",
        "primary-dark": "#1a3660",
        dark:           "#1c1c1b",
        muted:          "#636366",
        border:         "#e0e0e0",
        surface:        "#f2f2f2",
      },
      fontFamily: {
        sans:      ["var(--font-lato)", "sans-serif"],
        subtitle:  ["var(--font-quicksand)", "sans-serif"],
        secondary: ["var(--font-urbanist)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
