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
        accent: { DEFAULT: tok("accent"), ink: tok("accent-ink"), text: tok("accent-text") },
        band: { low: tok("band-low"), mid: tok("band-mid"), notable: tok("band-notable") },
        sheet: { DEFAULT: tok("sheet"), ink: tok("sheet-ink") },
      },
      fontFamily: { ui: ['"Inter Variable"', "system-ui", "sans-serif"] },
      fontSize: { "2xs": ["12px", "16px"], score: ["44px", { lineHeight: "1", letterSpacing: "-2px", fontWeight: "300" }] },
      borderRadius: { ctl: "8px", card: "12px", shell: "18px" },
      transitionTimingFunction: { ui: "var(--ease-out)", "ui-move": "var(--ease-in-out)" },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pop-in": { from: { opacity: "0", transform: "scale(0.97)" }, to: { opacity: "1", transform: "scale(1)" } },
        "rise-in": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "rise-out": { to: { opacity: "0", transform: "translateY(8px)" } },
        "slide-in-left": { from: { opacity: "0", transform: "translateX(-16px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "slide-in-right": { from: { opacity: "0", transform: "translateX(16px)" }, to: { opacity: "1", transform: "translateX(0)" } },
      },
      animation: {
        "fade-in": "fade-in 125ms var(--ease-out) both",
        "pop-in": "pop-in 150ms var(--ease-out) both",
        "rise-in": "rise-in 200ms var(--ease-out) both",
        "rise-out": "rise-out 150ms var(--ease-out) forwards",
        "slide-in-left": "slide-in-left 220ms var(--ease-drawer) both",
        "slide-in-right": "slide-in-right 220ms var(--ease-drawer) both",
      },
      boxShadow: {
        soft: "0 2px 6px rgb(var(--to-shadow) / calc(.06 * var(--to-shadow-k)))",
        lift: "0 8px 24px rgb(var(--to-shadow) / calc(.10 * var(--to-shadow-k)))",
      },
    },
  },
  plugins: [],
};
