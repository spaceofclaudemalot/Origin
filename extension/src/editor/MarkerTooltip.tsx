import React, { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { AnalysisResult, Detection } from "../types/types";
import { CATEGORY_LABEL } from "./AnalysisPanel";
import { matchCase } from "../analysis/live";

interface Hover { detection: Detection; x: number; y: number }

/** Infobulle au survol d'un marqueur : explication et suggestions. */
export const MarkerTooltip: React.FC<{ editor: Editor | null; result: AnalysisResult | null; sourceText: string }> = ({
  editor, result, sourceText,
}) => {
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    if (!editor || !result) return;
    const root = editor.view.dom;
    const byId = new Map(result.detections.map((d) => [d.id, d]));
    const onOver = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-detection-id]");
      const detection = el && byId.get(el.dataset.detectionId!);
      if (!el || !detection) return setHover(null);
      const rect = el.getBoundingClientRect();
      setHover({ detection, x: rect.left, y: rect.bottom + 6 });
    };
    const onLeave = () => setHover(null);
    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseleave", onLeave);
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, [editor, result]);

  if (!hover) return null;
  const { detection: d } = hover;
  const original = sourceText.slice(d.start, d.end) || d.text;
  return (
    <div
      role="tooltip"
      className="no-print fixed z-40 max-w-xs bg-[#fbfaf7] text-[#1d1d1b] border border-[#d6d2ca] text-2xs font-ui rounded-card shadow-lift p-3 pointer-events-none"
      style={{ left: Math.min(hover.x, window.innerWidth - 330), top: hover.y }}
    >
      <div className="text-[#b8411d] font-semibold mb-1">{CATEGORY_LABEL[d.category]} · score {d.score}</div>
      <p className="mb-2">{d.explanation}</p>
      {d.suggestions.length > 0 && (
        <p className="text-[#6b665e]">Suggestions : {d.suggestions.map((s) => matchCase(original, s.text) || "supprimer").join(", ")}</p>
      )}
    </div>
  );
};
