/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Outfit", "system-ui", "sans-serif"],
      },
      colors: {
        charcoal: {
          850: "#1a1b1f",
          925: "#121316",
          950: "#0a0b0d",
        },
      },
      boxShadow: {
        glow: {
          violet: "0 0 60px -12px rgba(139, 92, 246, 0.45)",
          cyan: "0 0 50px -15px rgba(34, 211, 238, 0.35)",
        },
      },
      backgroundImage: {
        "grid-dark":
          "linear-gradient(to right, rgb(39 39 42 / 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgb(39 39 42 / 0.35) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
