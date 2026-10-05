/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          900: "#312e81",
        },
        secondary: {
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        natural: {
          400: "#34d399",
          500: "#10b981",
        },
        verify: {
          400: "#fb923c",
          500: "#f97316",
        },
        alert: {
          500: "#ef4444",
          600: "#dc2626",
        },
        highlight: {
          yellow: "#fef08a",
          orange: "#fdba74",
          red: "#fca5a5",
          purple: "#d8b4fe",
          blue: "#93c5fd",
        },
      },
    },
  },
  plugins: [],
};