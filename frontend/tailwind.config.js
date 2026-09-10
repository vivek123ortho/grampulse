/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#16342E",
          light: "#234A41",
          dark: "#0E241F",
        },
        paper: "#F2F4EF",
        ochre: {
          DEFAULT: "#C08A28",
          light: "#D6A24B",
        },
        ink: "#1B1F1D",
        severity: {
          high: "#B5432D",
          medium: "#C08A28",
          low: "#3F7A57",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Work Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};