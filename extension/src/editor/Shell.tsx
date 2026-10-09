import React, { useCallback, useEffect, useRef, useState } from "react";
import { BP, layoutFor, readPrefs, writePrefs, type Layout, type LayoutPrefs } from "./layout";
import { IAnalysis, IDocs, ILogo, IPlus } from "../ui/icons";

/** Disposition courante, tiroirs ouverts et bascules du rail. */
export function useLayout() {
  const [width, setWidth] = useState(() => window.innerWidth);
  const [prefs, setPrefs] = useState<LayoutPrefs>(() => readPrefs());
  const [docsOpen, setDocsOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const layout = layoutFor(width, prefs);

  // Une zone passée en colonne n'a plus de tiroir ouvert
  useEffect(() => {
    if (layout.docs === "pinned") setDocsOpen(false);
    if (layout.analysis === "column") setAnalysisOpen(false);
  }, [layout.docs, layout.analysis]);

  const savePrefs = (next: LayoutPrefs) => {
    setPrefs(next);
    writePrefs(next);
  };

  const toggleDocs = () => {
    if (width >= BP.medium) savePrefs({ ...prefs, docsPinned: layout.docs !== "pinned" });
    else setDocsOpen((o) => !o);
  };
  const toggleAnalysis = () => {
    if (width >= BP.medium) savePrefs({ ...prefs, analysisShown: layout.analysis !== "column" });
    else setAnalysisOpen((o) => !o);
  };
  const openAnalysis = useCallback(() => {
    if (layoutFor(window.innerWidth, readPrefs()).analysis === "drawer") setAnalysisOpen(true);
  }, []);
  const closeDrawers = useCallback(() => {
    setDocsOpen(false);
    setAnalysisOpen(false);
  }, []);

  return { layout, docsOpen, analysisOpen, toggleDocs, toggleAnalysis, openAnalysis, closeDrawers };
}

const RailButton: React.FC<{
  label: string; active?: boolean; onClick: () => void; children: React.ReactNode; buttonRef?: React.Ref<HTMLButtonElement>;
}> = ({ label, active, onClick, children, buttonRef }) => (
  <button
    ref={buttonRef}
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    onClick={onClick}
    className={`w-10 h-10 rounded-card inline-flex items-center justify-center transition-colors ${
      active ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/10"
    }`}
  >
    {children}
  </button>
);

const Drawer: React.FC<{ side: "left" | "right"; label: string; onClose: () => void; children: React.ReactNode }> = ({
  side, label, onClose, children,
}) => (
  <div className="no-print fixed inset-0 z-40" role="dialog" aria-label={label} aria-modal="true">
    <div className="absolute inset-0 bg-black/30" onClick={onClose} />
    <div
      className={`absolute top-2 bottom-2 bg-surface rounded-shell shadow-lift overflow-auto ${
        side === "left" ? "left-[72px] w-[280px] max-w-[calc(100vw-88px)]" : "right-2 w-[340px] max-w-[calc(100vw-88px)]"
      }`}
    >
      {children}
    </div>
  </div>
);

/** Coquille de l'éditeur : rail, colonne/tiroir Documents, zone document, colonne/tiroir Analyse. */
export const Shell: React.FC<{
  layout: Layout;
  docsOpen: boolean;
  analysisOpen: boolean;
  onToggleDocs: () => void;
  onToggleAnalysis: () => void;
  onNewDoc: () => void;
  onCloseDrawers: () => void;
  docs: React.ReactNode;
  analysis: React.ReactNode;
  children: React.ReactNode;
}> = ({ layout, docsOpen, analysisOpen, onToggleDocs, onToggleAnalysis, onNewDoc, onCloseDrawers, docs, analysis, children }) => {
  const docsBtn = useRef<HTMLButtonElement>(null);
  const analysisBtn = useRef<HTMLButtonElement>(null);
  const anyDrawer = docsOpen || analysisOpen;

  const close = useCallback(() => {
    (docsOpen ? docsBtn : analysisBtn).current?.focus();
    onCloseDrawers();
  }, [docsOpen, onCloseDrawers]);

  useEffect(() => {
    if (!anyDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [anyDrawer, close]);

  return (
    <div className="to-shell h-screen flex gap-2 p-2 bg-canvas font-ui text-ink">
      <nav className="no-print w-14 shrink-0 bg-rail rounded-shell shadow-lift flex flex-col items-center py-3 gap-2" aria-label="Navigation">
        <div className="w-10 h-10 inline-flex items-center justify-center text-accent" title="TextOrigin">
          <ILogo className="w-6 h-6" />
        </div>
        <span className="w-6 h-px bg-white/15 my-1" aria-hidden="true" />
        <RailButton buttonRef={docsBtn} label="Documents" active={layout.docs === "pinned" || docsOpen} onClick={onToggleDocs}>
          <IDocs />
        </RailButton>
        <RailButton buttonRef={analysisBtn} label="Analyse" active={layout.analysis === "column" || analysisOpen} onClick={onToggleAnalysis}>
          <IAnalysis />
        </RailButton>
        <RailButton label="Nouveau document" onClick={onNewDoc}>
          <IPlus />
        </RailButton>
      </nav>

      {layout.docs === "pinned" && (
        <aside className="no-print w-[260px] shrink-0 bg-surface rounded-shell overflow-auto" aria-label="Documents">
          {docs}
        </aside>
      )}

      <div className="to-docarea flex-1 min-w-0 bg-surface rounded-shell flex flex-col overflow-hidden">{children}</div>

      {layout.analysis === "column" && (
        <aside className="no-print w-80 shrink-0 bg-surface rounded-shell overflow-auto" aria-label="Analyse">
          {analysis}
        </aside>
      )}

      {docsOpen && layout.docs === "drawer" && <Drawer side="left" label="Documents" onClose={close}>{docs}</Drawer>}
      {analysisOpen && layout.analysis === "drawer" && <Drawer side="right" label="Analyse" onClose={close}>{analysis}</Drawer>}
    </div>
  );
};
