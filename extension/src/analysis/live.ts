export function analysisDelay(textLength: number): number {
  return textLength > 20_000 ? 1500 : 500;
}

/**
 * Exécute des tâches asynchrones en signalant comme périmées celles qui ont
 * été dépassées par une exécution plus récente (ou par cancel()).
 */
export function createLatestOnly<T>() {
  let seq = 0;
  return {
    async run(fn: () => Promise<T>): Promise<{ stale: boolean; value: T }> {
      const id = ++seq;
      const value = await fn();
      return { stale: id !== seq, value };
    },
    cancel(): void {
      seq++;
    },
  };
}

/**
 * Le détecteur renvoie un texte en minuscules : on reporte la casse du
 * passage réel du document sur la suggestion.
 */
export function matchCase(original: string, replacement: string): string {
  if (!replacement) return replacement;
  const letters = original.replace(/[^\p{L}]/gu, "");
  if (letters.length > 1 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) {
    return replacement.toUpperCase();
  }
  const first = original.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}
