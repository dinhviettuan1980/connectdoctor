/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Health-green palette (lo-fi neutral paper + green accent)
        paper: { DEFAULT: "#fafaf7", 2: "#f1f0ea", dark: "#1b1d1a" },
        ink: { DEFAULT: "#1a1a1a", 2: "#444444", 3: "#767676", 4: "#b5b5b5" },
        line: { DEFAULT: "#2a2a2a", soft: "#c8c8c2" },
        accent: {
          DEFAULT: "#5eb594",  // approximated oklch(0.72 0.12 155)
          soft: "#dceee4",     // approximated oklch(0.92 0.05 155)
          ink: "#2f6b54",      // approximated oklch(0.42 0.08 155)
        },
        warn: "#d8a653",
        danger: "#c3604a",
      },
      fontFamily: {
        sans: ["Inter_400Regular", "System"],
        medium: ["Inter_500Medium", "System"],
        bold: ["Inter_700Bold", "System"],
        mono: ["JetBrainsMono_400Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        "card": "12px",
      },
    },
  },
  plugins: [],
};
