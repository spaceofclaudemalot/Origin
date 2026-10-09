export interface Span {
  start: number;
  end: number;
  text: string;
}
export interface Sentence extends Span {
  wordCount: number;
}
export interface Paragraph extends Span {
  wordCount: number;
  /** Indices dans `sentences`. */
  sentences: number[];
}
export interface Segmented {
  words: Span[];
  sentences: Sentence[];
  paragraphs: Paragraph[];
}

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const TERMINATORS = ".!?…";
const CLOSERS = "\"'’”»)]";
const OPENERS = "«\"“'(";
const ABBREVIATIONS = new Set([
  "e.g", "i.e", "etc", "vs", "m", "mme", "mlle", "dr", "mr", "mrs", "ms", "st", "cf", "ex", "p", "env", "no",
]);

const SPACES = new Set([" ", "\t", "\r", "\n", "\u00a0", "\u202f", "\u2009"]);

// Les abréviations reconnues font au plus 4 caractères (« mlle », « e.g ») : inutile
// de remonter plus loin, et un balayage borné garde le découpage linéaire.
const MAX_ABBREVIATION = 6;

/** Lettres et points juste avant `dot` (au plus MAX_ABBREVIATION + 1 caractères). */
function tokenBefore(text: string, blockStart: number, dot: number): string {
  let k = dot;
  while (k > blockStart && dot - k <= MAX_ABBREVIATION && (text[k - 1] === "." || /\p{L}/u.test(text[k - 1]))) k--;
  return text.slice(k, dot);
}

function isSpace(c: string | undefined): boolean {
  return c !== undefined && SPACES.has(c);
}

/**
 * Une fin de phrase se reconnaît à un terminateur suivi d'un espace puis
 * d'une majuscule ou d'un guillemet ouvrant, sauf après une abréviation
 * ou une initiale (« M. Dupont », « J. R. Tolkien »).
 */
function isBoundary(text: string, blockStart: number, dot: number, after: number, blockEnd: number): boolean {
  if (!isSpace(text[after])) return false;
  let k = after;
  while (k < blockEnd && isSpace(text[k])) k++;
  if (k >= blockEnd) return true;
  const next = text[k];
  if (!/\p{Lu}/u.test(next) && !OPENERS.includes(next)) return false;
  if (text[dot] === ".") {
    const token = tokenBefore(text, blockStart, dot);
    if (token) {
      if (ABBREVIATIONS.has(token.toLowerCase())) return false;
      if (token.length === 1 && /\p{Lu}/u.test(token)) return false;
    }
  }
  return true;
}

/** Nombre de mots, sans découpage complet. */
export function countWordsIn(text: string): number {
  return text.match(WORD)?.length ?? 0;
}

export function segment(text: string): Segmented {
  const words: Span[] = [...text.matchAll(WORD)].map((m) => ({
    start: m.index!,
    end: m.index! + m[0].length,
    text: m[0],
  }));
  const sentences: Sentence[] = [];
  const paragraphs: Paragraph[] = [];

  // Les mots sont triés : deux recherches dichotomiques au lieu d'un parcours complet
  const firstAtOrAfter = (pos: number) => {
    let lo = 0;
    let hi = words.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (words[mid].start < pos) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const countWords = (start: number, end: number) => {
    let n = 0;
    for (let i = firstAtOrAfter(start); i < words.length && words[i].end <= end; i++) n++;
    return n;
  };

  const pushSentence = (start: number, end: number) => {
    while (start < end && isSpace(text[start])) start++;
    while (end > start && isSpace(text[end - 1])) end--;
    if (end > start) sentences.push({ start, end, text: text.slice(start, end), wordCount: countWords(start, end) });
  };

  let blockStart = 0;
  for (const block of text.split("\n")) {
    const blockEnd = blockStart + block.length;
    const firstSentence = sentences.length;
    let sentenceStart = blockStart;
    for (let i = blockStart; i < blockEnd; i++) {
      if (!TERMINATORS.includes(text[i])) continue;
      let j = i + 1;
      while (j < blockEnd && (TERMINATORS.includes(text[j]) || CLOSERS.includes(text[j]))) j++;
      if (j < blockEnd && !isBoundary(text, blockStart, i, j, blockEnd)) {
        i = j - 1;
        continue;
      }
      pushSentence(sentenceStart, j);
      sentenceStart = j;
      i = j - 1;
    }
    pushSentence(sentenceStart, blockEnd);

    let start = blockStart;
    let end = blockEnd;
    while (start < end && isSpace(text[start])) start++;
    while (end > start && isSpace(text[end - 1])) end--;
    if (end > start) {
      paragraphs.push({
        start,
        end,
        text: text.slice(start, end),
        wordCount: countWords(start, end),
        sentences: Array.from({ length: sentences.length - firstSentence }, (_, k) => firstSentence + k),
      });
    }
    blockStart = blockEnd + 1;
  }

  return { words, sentences, paragraphs };
}
