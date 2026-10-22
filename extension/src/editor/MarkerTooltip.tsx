import React, { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { AnalysisResult, Detection } from "../types/types";
import { categoryLabel } from "./AnalysisPanel";
import { t, useLang } from "../i18n";
import { matchCase } from "../analysis/live";

interface Shown { detection: Detection; x: number; y: number; el: HTMLElement }

const TIP_ID = "to-marker-tip";

/**
 * Infobulle d'un marqueur : explication et suggestions. Elle s'ouvre au survol et aussi quand le
 * curseur du clavier entre dans un marqueur (annoncée alors comme un message d'état) ; Échap la ferme.
 * On n'écrit rien dans le DOM de l'éditeur : ProseMirror le réécrirait en boucle.
 */
export const MarkerTooltip: React.FC<{ editor: Editor | null; result: AnalysisResult | null; sourceText: string }> = ({
  editor, result, sourceText,
}) => {
  useLang();
  const [hover, setHover] = useState<Shown | null>(null);
  const [caret, setCaret] = useState<Shown | null>(null);

  useEffect(() => {
    if (!editor || !result) return;
    const root = editor.view.dom;
    const byId = new Map(result.detections.map((d) => [d.id, d]));
    const locate = (node: Node | null): Shown | null => {
      const start = node instanceof HTMLElement ? node : node?.parentElement;
      const el = start?.closest<HTMLElement>("[data-detection-id]");
      const detection = el && root.contains(el) ? byId.get(el.dataset.detectionId!) : undefined;
      if (!el || !detection) return null;
      const rect = el.getBoundingClientRect();
      return { detection, x: rect.left, y: rect.bottom + 6, el };
    };
    const onOver = (e: MouseEvent) => setHover(locate(e.target as Node));
    const onLeave = () => setHover(null);
    const onSelection = () => {
      const sel = document.getSelection();
      const next = sel?.isCollapsed && sel.anchorNode && root.contains(sel.anchorNode) ? locate(sel.anchorNode) : null;
      // Même marqueur : on garde l'état pour ne pas redessiner à chaque événement de sélection
      setCaret((prev) => (prev?.el === next?.el && prev?.detection === next?.detection ? prev : next));
    };
    const clear = () => {
      setHover(null);
      setCaret(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseleave", onLeave);
    document.addEventListener("selectionchange", onSelection);
    document.addEventListener("keydown", onKey);
    // Position fixe : on ferme au défilement plutôt que de laisser l'infobulle flotter ailleurs
    window.addEventListener("scroll", clear, true);
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("selectionchange", onSelection);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", clear, true);
    };
  }, [editor, result]);

  const shown = hover ?? caret;
  if (!shown) return null;
  const { detection: d } = shown;
  const original = sourceText.slice(d.start, d.end) || d.text;
  return (
    <div
      id={TIP_ID}
      // Au clavier, le texte est annoncé comme un message d'état (on ne touche pas au DOM de l'éditeur)
      role={shown === hover ? "tooltip" : "status"}
      className="no-print fixed z-40 animate-fade-in max-w-xs bg-sheet text-sheet-ink border border-[#d6d2ca] text-2xs font-ui rounded-card shadow-lift p-3 pointer-events-none"
      style={{ left: Math.min(shown.x, window.innerWidth - 330), top: shown.y }}
    >
      <div className="text-[#b8411d] font-semibold mb-1">{t("tooltip.score", { category: categoryLabel(d.category), score: d.score })}</div>
      <p className="mb-2">{d.explanation}</p>
      {d.suggestions.length > 0 && (
        <p className="text-[#6b665e]">
          {t("tooltip.suggestions", { list: d.suggestions.map((s) => matchCase(original, s.text) || t("tooltip.remove")).join(", ") })}
        </p>
      )}
    </div>
  );
};
