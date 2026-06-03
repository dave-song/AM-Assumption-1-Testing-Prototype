import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deliberately flat greys — wireframe palette only (principle 1).
        wire: {
          bg: "#f4f4f5",
          box: "#e4e4e7",
          border: "#a1a1aa",
          line: "#71717a",
          ink: "#3f3f46",
          muted: "#71717a",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
