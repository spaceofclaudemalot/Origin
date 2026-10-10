export type LayoutPrefs = { docsPinned?: boolean; analysisShown?: boolean };
export type Layout = { docs: "pinned" | "drawer"; analysis: "column" | "drawer"; labels: "gutter" | "inset" };

export const LAYOUT_KEY = "textorigin:layout";
export const BP = { wide: 1440, medium: 1200, narrow: 960 } as const;

/** Disposition selon la largeur ; un choix explicite l'emporte quand il y a la place. */
export function layoutFor(width: number, prefs: LayoutPrefs): Layout {
  const roomForColumns = width >= BP.medium;
  const docsPinned = roomForColumns && (prefs.docsPinned ?? width >= BP.wide);
  const analysisColumn = roomForColumns && (prefs.analysisShown ?? true);
  return {
    docs: docsPinned ? "pinned" : "drawer",
    analysis: analysisColumn ? "column" : "drawer",
    labels: roomForColumns ? "gutter" : "inset",
  };
}

const safeStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export function readPrefs(storage: Pick<Storage, "getItem"> | undefined = safeStorage()): LayoutPrefs {
  try {
    const raw = JSON.parse(storage?.getItem(LAYOUT_KEY) ?? "{}") as Record<string, unknown>;
    const prefs: LayoutPrefs = {};
    if (typeof raw.docsPinned === "boolean") prefs.docsPinned = raw.docsPinned;
    if (typeof raw.analysisShown === "boolean") prefs.analysisShown = raw.analysisShown;
    return prefs;
  } catch {
    return {};
  }
}

export function writePrefs(prefs: LayoutPrefs, storage: Pick<Storage, "setItem"> | undefined = safeStorage()): void {
  try {
    storage?.setItem(LAYOUT_KEY, JSON.stringify(prefs));
  } catch {
    // préférence perdue, sans gravité
  }
}
