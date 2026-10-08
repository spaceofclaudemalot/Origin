import React, { useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Detection, DetectionCategory } from "../types/types";
import { findMarkerRange, markerLevel, markersVisible, setMarkersVisible } from "./extensions/AiMarkers";
import { matchCase } from "../analysis/live";
import type { useLiveAnalysis } from "./useLiveAnalysis";

export const CATEGORY_LABEL: Record<DetectionCategory, string> = {
  "lexical-marker": "Marqueur lexical",
  "discourse-structure": "Structure discursive",
  transition: "Connecteur excessif",
  "style-regularity": "Régularité stylistique",
  anomaly: "Anomalie stylistique",
};

const LEVEL_DOT = { low: "bg-blue-400", medium: "bg-amber-400", high: "bg-red-500" } as const;
const CONFIDENCE_LABEL: Record<string, string> = { high: "Haute", medium: "Moyenne", low: "Faible" };

export function scoreColor(score: number): string {
  return score < 21 ? "text-natural-500" : score < 41 ? "text-primary-500" : score < 61 ? "text-verify-500" : "text-alert-500";
}

/** Remplace le passage marqué ; transaction normale, donc annulable par Ctrl+Z. */
export function applySuggestion(editor: Editor, detection: Detection, original: string, replacement: string): boolean {
  const range = findMarkerRange(editor.state, detection.id);
  if (!range) return false;
  const text = matchCase(original, replacement);
  const tr = text
    ? editor.state.tr.insertText(text, range.from, range.to)
    : editor.state.tr.delete(range.from, range.to);
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
  return true;
}

function reveal(editor: Editor, detection: Detection) {
  const range = findMarkerRange(editor.state, detection.id);
  if (!range) return;
  editor.chain().focus().setTextSelection(range).scrollIntoView().run();
}

export const AnalysisPanel: React.FC<{ editor: Editor | null; analysis: ReturnType<typeof useLiveAnalysis> }> = ({
  editor, analysis,
}) => {
  const { result, state, sourceText } = analysis;
  const [visible, setVisible] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleVisible = () => {
    if (!editor) return;
    const next = !markersVisible(editor.state);
    editor.view.dispatch(setMarkersVisible(editor.state, next));
    setVisible(next);
  };

  const detections = [...(result?.detections ?? [])].sort((a, b) => a.start - b.start);

  return (
    <aside className="no-print w-80 shrink-0 border-l border-gray-200 bg-white overflow-auto" aria-label="Analyse">
      <div className="p-4 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Analyse</h2>

        {state === "empty" && <p className="text-sm text-gray-500">Écrivez ou collez du texte pour l'analyser.</p>}
        {state === "error" && <p className="text-sm text-alert-600" role="alert">Analyse indisponible. Nouvel essai à la prochaine modification.</p>}

        {result && state !== "empty" && (
          <>
            <div className="text-center">
              <div className={`text-4xl font-bold ${scoreColor(result.totalScore)}`}>{result.totalScore}<span className="text-base text-gray-400">/100</span></div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">AI Marker Score</div>
              <div className="text-xs text-gray-500 mt-1">
                Confiance : {CONFIDENCE_LABEL[result.confidence] ?? result.confidence}
                {state === "running" && " · mise à jour…"}
              </div>
            </div>

            <ul className="text-sm space-y-1">
              {(Object.keys(CATEGORY_LABEL) as DetectionCategory[])
                .filter((c) => result.categories[c] > 0)
                .map((c) => (
                  <li key={c} className="flex justify-between">
                    <span>{CATEGORY_LABEL[c]}</span>
                    <span className="font-medium">{result.categories[c]}</span>
                  </li>
                ))}
            </ul>

            <button onClick={toggleVisible} className="w-full text-sm py-1.5 rounded border border-gray-300 hover:bg-gray-50">
              {visible ? "Masquer les marqueurs" : "Afficher les marqueurs"}
            </button>

            {detections.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun marqueur détecté.</p>
            ) : (
              <ul className="space-y-2">
                {detections.map((d) => {
                  const original = sourceText.slice(d.start, d.end) || d.text;
                  return (
                    <li key={d.id} className="border rounded-lg p-2 text-sm">
                      <button
                        className="w-full text-left flex items-center gap-2"
                        onClick={() => { if (editor) reveal(editor, d); setOpenId(openId === d.id ? null : d.id); }}
                      >
                        <span className={`w-2 h-2 rounded-full ${LEVEL_DOT[markerLevel(d.score)]}`} aria-hidden="true" />
                        <span className="font-medium">« {original} »</span>
                        <span className="ml-auto text-xs text-gray-500">{CATEGORY_LABEL[d.category]}</span>
                      </button>
                      {openId === d.id && (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-gray-600">{d.explanation}</p>
                          <div className="flex flex-wrap gap-1">
                            {d.suggestions.map((s) => (
                              <button
                                key={s.text}
                                title={s.reason}
                                onClick={() => editor && applySuggestion(editor, d, original, s.text)}
                                className="text-xs px-2 py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100"
                              >
                                {s.text ? `→ ${matchCase(original, s.text)}` : "Supprimer"}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
