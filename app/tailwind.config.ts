import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        steppe: {
          50: "#faf7f0",
          100: "#f5e6c8",
          200: "#e8d0a0",
          300: "#d4b06a",
          400: "#c49645",
          500: "#b07d2e",
          600: "#8c6124",
          700: "#6b491c",
        },
        forest: {
          50: "#e8f5ec",
          100: "#c6e6cf",
          200: "#94d1a5",
          300: "#5bb876",
          400: "#2d9a4e",
          500: "#1a6b35",
          600: "#1a3a2a",
          700: "#142d20",
          800: "#0e1f16",
          900: "#0a150f",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
