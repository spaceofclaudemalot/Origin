import React, { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Detection, DetectionCategory, GlobalSignal, InvisibleFinding, InvisibleReport, SignalFamily } from "../types/types";
import { findMarkerRange, markerLevel, markersVisible, setMarkersVisible } from "./extensions/AiMarkers";
import { setSignalHighlight } from "./extensions/SignalHighlights";
import { matchCase } from "../analysis/live";
import { buildTextIndex, mapRange, mapRanges } from "../analysis/positions";
import { cleanupTransaction } from "./invisibleCleanup";
import { FAMILY_LABEL, FAMILY_OF_TYPE } from "../analysis/scoring";
import type { useLiveAnalysis } from "./useLiveAnalysis";
import { Button, Card, Chip, Collapsible, IconButton } from "../ui/primitives";
import { ScoreGauge } from "../ui/ScoreGauge";
import { IEye, IEyeOff } from "../ui/icons";

export const CATEGORY_LABEL: Record<DetectionCategory, string> = {
  "lexical-marker": "Marqueur lexical",
  "discourse-structure": "Formulation stéréotypée",
  transition: "Connecteur excessif",
  "style-regularity": "Régularité stylistique",
  anomaly: "Anomalie stylistique",
};

const LEVEL_DOT = { low: "bg-accent/30", medium: "bg-accent/60", high: "bg-accent" } as const;
const CONFIDENCE_LABEL: Record<string, string> = { high: "haute", medium: "moyenne", low: "faible" };
const STATUS_ICON: Record<GlobalSignal["status"], string> = { ok: "✓", alert: "⚠", insufficient: "⋯" };
const MARKER_FAMILIES: SignalFamily[] = ["vocabulary", "connectors", "stereotypes"];
const ICON = "w-[18px] h-[18px]";

export const WARNING =
  "Indices stylistiques, pas une preuve. Les textes académiques formels et ceux d'auteurs non natifs produisent des faux positifs.";

/** Demande venue d'une étiquette de marge : montrer ces détections ou ces signaux. */
export interface PanelFocus {
  nonce: number;
  detectionIds: string[];
  signals: GlobalSignal["id"][];
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

const INVISIBLE_LABEL: Record<string, string> = {
  ZWSP: "Espace de largeur nulle",
  ZWNJ: "Anti-liant de largeur nulle",
  ZWJ: "Liant de largeur nulle",
  WJ: "Gluon de mots",
  BOM: "Indicateur d'ordre des octets",
  SHY: "Trait d'union conditionnel",
  CGJ: "Graphème combinant",
  MVS: "Séparateur de voyelle mongol",
  LRM: "Marque gauche-à-droite",
  RLM: "Marque droite-à-gauche",
  FILLER: "Caractère de remplissage",
  INVOP: "Opérateur mathématique invisible",
  NBSP: "Espace insécable",
  NNBSP: "Espace fine insécable",
  ENSP: "Espace demi-cadratin",
  EMSP: "Espace cadratin",
  SPACE: "Espace typographique",
  FIGSP: "Espace de chiffre",
  PUNCSP: "Espace de ponctuation",
  THSP: "Espace fine",
  HSP: "Espace ultra-fine",
  IDSP: "Espace idéographique",
  TAG: "Caractères « tag » (texte caché)",
  VS: "Sélecteur de variante",
};
const invisibleLabel = (name: string) => INVISIBLE_LABEL[name] ?? "Contrôle bidirectionnel";

/** Caractères invisibles : indice de copier-coller ou de manipulation, hors score. */
const InvisiblesSection: React.FC<{ editor: Editor | null; report: InvisibleReport; sourceText: string }> = ({
  editor, report, sourceText,
}) => {
  const groups = new Map<string, { count: number; severity: InvisibleFinding["severity"]; first: InvisibleFinding }>();
  for (const f of report.findings) {
    const g = groups.get(f.name);
    if (g) g.count += f.count;
    else groups.set(f.name, { count: f.count, severity: f.severity, first: f });
  }
  const hidden = report.findings.map((f) => f.hidden).filter(Boolean).join(" ");

  // Les positions du rapport ne valent que pour le texte analysé
  const currentIndex = () => {
    if (!editor) return null;
    const index = buildTextIndex(editor.state.doc);
    return index.text === sourceText ? index : null;
  };
  const select = (f: InvisibleFinding) => {
    const index = currentIndex();
    const r = index && mapRange(index, f.start, f.end);
    if (editor && r) editor.chain().focus().setTextSelection(r).scrollIntoView().run();
  };
  const clean = () => {
    const index = currentIndex();
    if (!editor || !index) return;
    editor.view.dispatch(cleanupTransaction(editor.state, index, report.findings).scrollIntoView());
    editor.commands.focus();
  };

  return (
    <Collapsible id="invisibles" title="Caractères invisibles" count={report.total}>
      <div className="space-y-2">
        {report.suspects > 0 && (
          <div role="alert" className="rounded-card border border-accent/50 bg-accent/10 shadow-[0_0_12px_rgb(var(--to-accent)/0.25)] p-2.5 text-2xs">
            <strong className="text-accent">
              {report.suspects} caractère{report.suspects > 1 ? "s" : ""} suspect{report.suspects > 1 ? "s" : ""}
            </strong>{" "}
            : contenu caché ou inversion du sens de lecture, souvent utilisé pour dissimuler des consignes.
            {hidden && (
              <p className="mt-1 break-words">
                Texte caché : « <em>{hidden}</em> »
              </p>
            )}
          </div>
        )}
        <ul className="space-y-0.5">
          {[...groups].map(([name, g]) => (
            <li key={name}>
              <button
                onClick={() => select(g.first)}
                className={`w-full flex justify-between gap-2 text-[13px] text-left rounded-ctl px-2 py-1 hover:bg-raised ${g.severity === "suspect" ? "text-accent" : ""}`}
              >
                <span>{invisibleLabel(name)} <span className="text-2xs text-muted">{name}</span></span>
                <span className="font-medium">{g.count}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-2xs text-muted">
          Indice de copier-coller depuis un outil (IA ou autre), pas une preuve de rédaction par IA. Non compté dans le score.
        </p>
        <Button variant="secondary" className="w-full" onClick={clean}>
          Nettoyer le texte
        </Button>
      </div>
    </Collapsible>
  );
};

const familySection = (f: SignalFamily) => `fam-${f}`;

export const AnalysisPanel: React.FC<{
  editor: Editor | null;
  analysis: ReturnType<typeof useLiveAnalysis>;
  highlighted: GlobalSignal["id"] | null;
  onHighlight: (id: GlobalSignal["id"] | null) => void;
  focus: PanelFocus | null;
  onVisibleChange: (visible: boolean) => void;
}> = ({ editor, analysis, highlighted, onHighlight, focus, onVisibleChange }) => {
  const { result, state, sourceText } = analysis;
  const visible = editor ? markersVisible(editor.state) : true;
  const [openId, setOpenId] = useState<string | null>(null);
  // Sections ouvertes à la demande d'une étiquette de marge (sinon état mémorisé)
  const [forced, setForced] = useState<Record<string, true>>({});

  // Nouveau document (nouvel éditeur) : état d'affichage remis à zéro
  useEffect(() => {
    setOpenId(null);
    setForced({});
  }, [editor]);

  // Le surlignage suit chaque nouvelle analyse, ou disparaît si le signal n'est plus en alerte
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const signal = highlighted ? result?.signals.find((s) => s.id === highlighted) : undefined;
    if (!signal || signal.status !== "alert") {
      if (highlighted) onHighlight(null);
      editor.view.dispatch(setSignalHighlight(editor.state, null));
      return;
    }
    const index = buildTextIndex(editor.state.doc);
    if (index.text !== sourceText) return; // une analyse plus récente va suivre
    editor.view.dispatch(setSignalHighlight(editor.state, mapRanges(index, signal.ranges)));
  }, [editor, result, sourceText, highlighted, onHighlight]);

  // Étiquette de marge cliquée : ouvrir la bonne section, y défiler, sélectionner dans le texte
  useEffect(() => {
    if (!focus || !result) return;
    const first = result.detections.find((d) => d.id === focus.detectionIds[0]);
    const section = first ? familySection(FAMILY_OF_TYPE[first.type]) : focus.signals.length ? "signals" : null;
    if (!section) return;
    setForced((f) => ({ ...f, [section]: true }));
    if (first) {
      setOpenId(first.id);
      if (editor) reveal(editor, first);
    }
    const target = first ? `to-det-${first.id}` : `to-sig-${focus.signals[0]}`;
    requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Section contrôlée tant qu'une étiquette l'a ouverte ; un clic de l'utilisateur rend la main. */
  const sectionProps = (id: string) => ({
    id,
    open: forced[id],
    onOpenChange: () =>
      setForced((f) => {
        const { [id]: _, ...rest } = f;
        return rest;
      }),
  });

  const toggleVisible = () => {
    if (!editor) return;
    const next = !markersVisible(editor.state);
    editor.view.dispatch(setMarkersVisible(editor.state, next));
    onVisibleChange(next);
  };

  const detections = [...(result?.detections ?? [])].sort((a, b) => a.start - b.start);
  const alerts = result?.signals.filter((s) => s.status === "alert").length ?? 0;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-2xs font-semibold uppercase tracking-wider text-muted">Analyse</h2>
        <IconButton label={visible ? "Masquer les marqueurs" : "Afficher les marqueurs"} onClick={toggleVisible} disabled={!editor}>
          {visible ? <IEye className={ICON} /> : <IEyeOff className={ICON} />}
        </IconButton>
      </div>

      <Card className="p-4">
        {state === "empty" && <p className="text-[13px] text-muted">Écrivez ou collez du texte pour l'analyser.</p>}
        {state === "error" && (
          <p className="text-[13px] text-accent" role="alert">Analyse indisponible. Nouvel essai à la prochaine modification.</p>
        )}
        {result && state !== "empty" && (
          <ScoreGauge
            score={result.totalScore}
            caption={
              <>
                {result.wordCount} mots · confiance {CONFIDENCE_LABEL[result.confidence] ?? result.confidence}
                {state === "running" && " · mise à jour…"}
              </>
            }
          />
        )}
      </Card>

      {result && state !== "empty" && (
        <>
          <Collapsible id="families" title="Familles">
            <ul className="space-y-2">
              {result.families.map((f) => (
                <li key={f.family} className={`text-[13px] ${f.measurable ? "" : "text-muted"}`}>
                  <div className="flex justify-between">
                    <span>
                      {FAMILY_LABEL[f.family]} <span className="text-2xs text-muted">({Math.round(f.weight * 100)} %)</span>
                    </span>
                    <span className="font-medium">{f.measurable ? f.score : "texte trop court"}</span>
                  </div>
                  {f.measurable && (
                    <div className="h-1.5 mt-1 bg-line rounded-full" aria-hidden="true">
                      <div className="h-1.5 rounded-full bg-ink/70" style={{ width: `${f.score}%` }} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Collapsible>

          <Collapsible {...sectionProps("signals")} title="Signaux globaux" count={alerts}>
            <div className="space-y-2">
              {result.signals.map((s) => (
                <div
                  key={s.id}
                  id={`to-sig-${s.id}`}
                  className={`rounded-card border p-2.5 text-[13px] ${s.status === "alert" ? "border-accent/50 bg-accent/5" : "border-line"}`}
                >
                  <div className="flex items-center gap-2">
                    <span aria-label={s.status} className={s.status === "alert" ? "text-accent" : "text-muted"}>
                      {STATUS_ICON[s.status]}
                    </span>
                    <span className="font-medium">{s.label}</span>
                  </div>
                  <div className="text-2xs text-muted mt-0.5">{s.status === "insufficient" ? "Texte trop court" : s.display}</div>
                  <p className="text-2xs text-muted mt-1">{s.explanation}</p>
                  {s.status === "alert" && (
                    <Chip as="button" tone="outline" className="mt-2" onClick={() => onHighlight(highlighted === s.id ? null : s.id)}>
                      {highlighted === s.id ? "Retirer le surlignage" : "Surligner les phrases"}
                    </Chip>
                  )}
                </div>
              ))}
            </div>
          </Collapsible>

          {result.invisibles.total > 0 && (
            <InvisiblesSection editor={editor} report={result.invisibles} sourceText={sourceText} />
          )}

          {detections.length === 0 ? (
            <p className="text-[13px] text-muted">Aucun marqueur détecté.</p>
          ) : (
            MARKER_FAMILIES.map((family) => {
              const list = detections.filter((d) => FAMILY_OF_TYPE[d.type] === family);
              if (!list.length) return null;
              return (
                <Collapsible key={family} {...sectionProps(familySection(family))} title={FAMILY_LABEL[family]} count={list.length}>
                  <ul className="space-y-1.5">
                    {list.map((d) => {
                      const original = sourceText.slice(d.start, d.end) || d.text;
                      return (
                        <li key={d.id} id={`to-det-${d.id}`} className="rounded-card bg-raised border border-line p-2.5 text-[13px]">
                          <button
                            className="w-full text-left flex items-center gap-2"
                            onClick={() => {
                              if (editor) reveal(editor, d);
                              setOpenId(openId === d.id ? null : d.id);
                            }}
                          >
                            <span className={`w-2 h-2 shrink-0 rounded-full ${LEVEL_DOT[markerLevel(d.score)]}`} aria-hidden="true" />
                            <span className="font-medium truncate">« {original} »</span>
                          </button>
                          {openId === d.id && (
                            <div className="mt-2 space-y-2">
                              <p className="text-2xs text-muted">{d.explanation}</p>
                              <div className="flex flex-wrap gap-1">
                                {d.suggestions.map((s) => (
                                  <Chip
                                    as="button"
                                    key={s.text}
                                    title={s.reason}
                                    tone={s.text ? "accent" : "outline"}
                                    onClick={() => editor && applySuggestion(editor, d, original, s.text)}
                                  >
                                    {s.text ? `→ ${matchCase(original, s.text)}` : "Supprimer"}
                                  </Chip>
                                ))}
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Collapsible>
              );
            })
          )}
        </>
      )}

      <p className="rounded-card bg-raised/70 border border-line p-3 text-2xs text-muted" role="note">
        {WARNING}
      </p>
    </div>
  );
};
