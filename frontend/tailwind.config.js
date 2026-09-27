/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c2430",
        paper: "#f4f0e6",
        card: "#fffdf8",
        line: "#e4dccf",
        teal: "#0c6b66",
        tide: "#e7f3f1",
        amber: "#8a5a12",
        clay: "#8d3d4a",
        stone: "#d9d2c5",
      },
      fontFamily: {
        sans: ["Avenir Next", "Segoe UI", "sans-serif"],
        serif: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
