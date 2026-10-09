/** Jetons de texte et de fond (copie hex de tokens.css), vérifiés par contrast.test.ts. */
export const TOKENS = {
  light: { surface: "#e4e1db", raised: "#ebe8e2", ink: "#1d1d1b", muted: "#5f5a52", accent: "#df5830", accentInk: "#ffffff" },
  dark: { surface: "#232321", raised: "#2c2c2a", ink: "#ece9e3", muted: "#9d988f", accent: "#e8683f", accentInk: "#ffffff" },
} as const;

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Ratio de contraste WCAG 2 entre deux couleurs #rrggbb. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
