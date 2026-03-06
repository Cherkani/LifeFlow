import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        slateBlue: "#1f3a8a",
        dawn: "#f7f9fc",
        steel: "#334155"
      },
      boxShadow: {
        panel: "0 10px 40px -18px rgba(15, 23, 42, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
