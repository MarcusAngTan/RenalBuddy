/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#163428",
        paper: "#e8f6d6",
        card: "#ffffff",
        line: "#cfe8b6",
        teal: "#2f9e44",
        lime: "#5ec445",
        tide: "#def0c4",
        amber: "#a16207",
        clay: "#c45c62",
        stone: "#d4ebba",
        forest: "#173036",
      },
      fontFamily: {
        sans: ["Nunito", "Segoe UI", "sans-serif"],
        serif: ["Nunito", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px rgba(52, 120, 48, 0.08)",
        pop: "0 12px 28px rgba(52, 168, 83, 0.22)",
      },
    },
  },
  plugins: [],
};
