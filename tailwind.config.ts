import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif", ...fontFamily.sans],
      },
      colors: {
        pool: {
          50: "#eff8ff",
          100: "#dbeefe",
          200: "#bee0fe",
          300: "#91cdfd",
          400: "#5db2fa",
          500: "#3893f5",
          600: "#2276eb",
          700: "#1a5fd7",
          800: "#1c4eae",
          900: "#1c4489",
          950: "#152a54",
        },
      },
    },
  },
  plugins: [],
};

export default config;
