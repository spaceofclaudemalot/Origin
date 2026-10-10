/** @type {import('tailwindcss').Config} */
const tok = (name) => `rgb(var(--to-${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        canvas: tok("canvas"),
        surface: tok("surface"),
        raised: tok("raised"),
        line: tok("line"),
        rail: tok("rail"),
        ink: tok("ink"),
        muted: tok("muted"),
        accent: { DEFAULT: tok("accent"), ink: tok("accent-ink") },
        band: { low: tok("band-low"), mid: tok("band-mid"), notable: tok("band-notable") },
        sheet: { DEFAULT: tok("sheet"), ink: tok("sheet-ink") },
      },
      fontFamily: { ui: ['"Inter Variable"', "system-ui", "sans-serif"] },
      fontSize: { "2xs": ["12px", "16px"], score: ["44px", { lineHeight: "1", letterSpacing: "-2px", fontWeight: "300" }] },
      borderRadius: { ctl: "8px", card: "12px", shell: "18px" },
      boxShadow: {
        soft: "0 2px 6px rgb(var(--to-shadow) / calc(.06 * var(--to-shadow-k)))",
        lift: "0 8px 24px rgb(var(--to-shadow) / calc(.10 * var(--to-shadow-k)))",
      },
    },
  },
  plugins: [],
};
