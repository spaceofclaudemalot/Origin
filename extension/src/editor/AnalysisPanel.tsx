import React, { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Detection, DetectionCategory, GlobalSignal, SignalFamily } from "../types/types";
import { findMarkerRange, markerLevel, markersVisible, setMarkersVisible } from "./extensions/AiMarkers";
import { setSignalHighlight } from "./extensions/SignalHighlights";
import { matchCase } from "../analysis/live";
import { buildTextIndex, mapRanges } from "../analysis/positions";
import { FAMILY_LABEL, FAMILY_OF_TYPE } from "../analysis/scoring";
import type { useLiveAnalysis } from "./useLiveAnalysis";

export const CATEGORY_LABEL: Record<DetectionCategory, string> = {
  "lexical-marker": "Marqueur lexical",
  "discourse-structure": "Formulation stéréotypée",
  transition: "Connecteur excessif",
  "style-regularity": "Régularité stylistique",
  anomaly: "Anomalie stylistique",
};

const LEVEL_DOT = { low: "bg-blue-400", medium: "bg-amber-400", high: "bg-red-500" } as const;
const CONFIDENCE_LABEL: Record<string, string> = { high: "Haute", medium: "Moyenne", low: "Faible" };
const STATUS_ICON: Record<GlobalSignal["status"], string> = { ok: "✓", alert: "⚠", insufficient: "⋯" };
const MARKER_FAMILIES: SignalFamily[] = ["vocabulary", "connectors", "stereotypes"];

export const WARNING =
  "Indices stylistiques, pas une preuve. Les textes académiques formels et ceux d'auteurs non natifs produisent des faux positifs.";

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
  const [highlighted, setHighlighted] = useState<GlobalSignal["id"] | null>(null);

  // Nouveau document (nouvel éditeur) : état d'affichage remis à zéro
  useEffect(() => {
    setVisible(true);
    setHighlighted(null);
    setOpenId(null);
  }, [editor]);

  // Le surlignage suit chaque nouvelle analyse, ou disparaît si le signal n'est plus en alerte
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const signal = highlighted ? result?.signals.find((s) => s.id === highlighted) : undefined;
    if (!signal || signal.status !== "alert") {
      if (highlighted) setHighlighted(null);
      editor.view.dispatch(setSignalHighlight(editor.state, null));
      return;
    }
    const index = buildTextIndex(editor.state.doc);
    if (index.text !== sourceText) return; // une analyse plus récente va suivre
    editor.view.dispatch(setSignalHighlight(editor.state, mapRanges(index, signal.ranges)));
  }, [editor, result, sourceText, highlighted]);

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
                Confiance : {CONFIDENCE_LABEL[result.confidence] ?? result.confidence} · {result.wordCount} mots
                {state === "running" && " · mise à jour…"}
              </div>
            </div>

            <section aria-label="Familles">
              <ul className="space-y-1.5">
                {result.families.map((f) => (
                  <li key={f.family} className={`text-sm ${f.measurable ? "" : "text-gray-400"}`}>
                    <div className="flex justify-between">
                      <span>{FAMILY_LABEL[f.family]} <span className="text-xs text-gray-400">({Math.round(f.weight * 100)} %)</span></span>
                      <span className="font-medium">{f.measurable ? f.score : "texte trop court"}</span>
                    </div>
                    {f.measurable && (
                      <div className="h-1.5 bg-gray-100 rounded" aria-hidden="true">
                        <div className="h-1.5 rounded bg-primary-500" style={{ width: `${f.score}%` }} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Signaux globaux" className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Signaux globaux</h3>
              {result.signals.map((s) => (
                <div key={s.id} className={`border rounded-lg p-2 text-sm ${s.status === "alert" ? "border-verify-400 bg-orange-50" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span aria-label={s.status}>{STATUS_ICON[s.status]}</span>
                    <span className="font-medium">{s.label}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">{s.status === "insufficient" ? "Texte trop court" : s.display}</div>
                  <p className="text-xs text-gray-500 mt-1">{s.explanation}</p>
                  {s.status === "alert" && (
                    <button
                      onClick={() => setHighlighted(highlighted === s.id ? null : s.id)}
                      className="mt-1 text-xs underline text-secondary-600"
                    >
                      {highlighted === s.id ? "Retirer le surlignage" : "Surligner les phrases"}
                    </button>
                  )}
                </div>
              ))}
            </section>

            <button onClick={toggleVisible} className="w-full text-sm py-1.5 rounded border border-gray-300 hover:bg-gray-50">
              {visible ? "Masquer les marqueurs" : "Afficher les marqueurs"}
            </button>

            {detections.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun marqueur détecté.</p>
            ) : (
              MARKER_FAMILIES.map((family) => {
                const list = detections.filter((d) => FAMILY_OF_TYPE[d.type] === family);
                if (!list.length) return null;
                return (
                  <section key={family} aria-label={FAMILY_LABEL[family]}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                      {FAMILY_LABEL[family]} ({list.length})
                    </h3>
                    <ul className="space-y-2">
                      {list.map((d) => {
                        const original = sourceText.slice(d.start, d.end) || d.text;
                        return (
                          <li key={d.id} className="border rounded-lg p-2 text-sm">
                            <button
                              className="w-full text-left flex items-center gap-2"
                              onClick={() => { if (editor) reveal(editor, d); setOpenId(openId === d.id ? null : d.id); }}
                            >
                              <span className={`w-2 h-2 rounded-full ${LEVEL_DOT[markerLevel(d.score)]}`} aria-hidden="true" />
                              <span className="font-medium truncate">« {original} »</span>
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
                  </section>
                );
              })
            )}
          </>
        )}

        <p className="text-xs text-gray-500 border-t pt-3" role="note">{WARNING}</p>
      </div>
    </aside>
  );
};
