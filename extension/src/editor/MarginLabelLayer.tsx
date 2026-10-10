import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { AnalysisResult, GlobalSignal } from "../types/types";
import { buildTextIndex, mapRanges } from "../analysis/positions";
import { setSignalHighlight } from "./extensions/SignalHighlights";
import { blockAnnotations, reconcileAnnotations, stackLabels, SIGNAL_SHORT, type BlockAnnotation } from "./marginLabels";

const LABEL_HEIGHT = 22;
const LABEL_GAP = 4;
/** Place minimale à gauche de la feuille pour sortir les étiquettes de la marge. */
const GUTTER_MIN = 124;

/** Prochaine frame ; page masquée (rAF suspendu) : tâche suivante. */
function nextFrame(cb: () => void): () => void {
  if (document.hidden) {
    const id = window.setTimeout(cb, 0);
    return () => window.clearTimeout(id);
  }
  const id = requestAnimationFrame(cb);
  return () => cancelAnimationFrame(id);
}

const LEVEL_BG = { low: "bg-accent/45", medium: "bg-accent/75", high: "bg-accent" } as const;
const LEVEL_BAR = { low: "bg-accent/40", medium: "bg-accent/70", high: "bg-accent" } as const;

interface Placed {
  a: BlockAnnotation;
  top: number;
  height: number;
  /** Bord gauche du texte du bloc, relatif au conteneur de la feuille. */
  left: number;
  labelTop: number;
}

const plural = (n: number) => (n > 1 ? "S" : "");

function labelText(a: BlockAnnotation): string {
  if (a.markerCount) return `${a.markerCount} MARQUEUR${plural(a.markerCount)}`;
  const more = a.signals.length > 1 ? ` +${a.signals.length - 1}` : "";
  return SIGNAL_SHORT[a.signals[0]] + more;
}

function ariaText(a: BlockAnnotation): string {
  const parts: string[] = [];
  if (a.markerCount) parts.push(`${a.markerCount} marqueur${a.markerCount > 1 ? "s" : ""} dans ce paragraphe`);
  if (a.signals.length) parts.push(`signal : ${a.signals.map((s) => SIGNAL_SHORT[s].toLowerCase()).join(", ")}`);
  return parts.join(", ");
}

/**
 * Étiquettes en marge : un calque hors du DOM de ProseMirror, positionné sur
 * les blocs qui contiennent des marqueurs ou des phrases de signaux en alerte.
 * Rien n'entre dans le document, la sauvegarde, l'historique ni les exports.
 */
export const MarginLabels: React.FC<{
  editor: Editor | null;
  result: AnalysisResult | null;
  sourceText: string;
  visible: boolean;
  highlighted: GlobalSignal["id"] | null;
  onFocus: (a: BlockAnnotation) => void;
}> = ({ editor, result, sourceText, visible, highlighted, onFocus }) => {
  const layer = useRef<HTMLDivElement>(null);
  const annotations = useRef<BlockAnnotation[]>([]);
  const owner = useRef<Editor | null>(null);
  const [version, setVersion] = useState(0);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [gutter, setGutter] = useState(false);
  // Marqueurs du bloc survolé : règle CSS plutôt qu'une classe, que ProseMirror effacerait en redessinant
  const [focusIds, setFocusIds] = useState<string[]>([]);

  // Nouvelle analyse : regroupement par bloc, seulement si elle porte sur le texte courant
  useEffect(() => {
    let fresh: BlockAnnotation[] | null = [];
    if (editor && !editor.isDestroyed && result) {
      const index = buildTextIndex(editor.state.doc);
      // Analyse d'un autre texte (frappe en cours ou document précédent) : une plus récente va suivre
      fresh = index.text === sourceText ? blockAnnotations(editor.state.doc, result, index) : null;
    }
    const next = reconcileAnnotations({ owner: owner.current, list: annotations.current }, editor, fresh);
    owner.current = next.owner;
    annotations.current = next.list;
    setVersion((v) => v + 1);
  }, [editor, result, sourceText]);

  // Entre deux analyses, les étiquettes suivent leurs blocs
  useEffect(() => {
    if (!editor) return;
    const onTransaction = ({ transaction }: { transaction: import("@tiptap/pm/state").Transaction }) => {
      if (transaction.docChanged) {
        annotations.current = annotations.current.map((a) => ({
          ...a,
          pos: transaction.mapping.map(a.pos),
          signalRanges: a.signalRanges.map((r) => ({ from: transaction.mapping.map(r.from), to: transaction.mapping.map(r.to) })),
        }));
      }
      setVersion((v) => v + 1);
    };
    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor]);

  const measure = useCallback(() => {
    const wrap = layer.current?.parentElement;
    if (!editor || editor.isDestroyed || !wrap) return;
    const sheet = wrap.querySelector<HTMLElement>(".sheet");
    const box = wrap.getBoundingClientRect();
    const scroller = wrap.closest("main");
    setGutter(!!sheet && !!scroller && sheet.getBoundingClientRect().left - scroller.getBoundingClientRect().left >= GUTTER_MIN);

    const items: Omit<Placed, "labelTop">[] = [];
    for (const a of annotations.current) {
      if (!editor.state.doc.nodeAt(a.pos)?.isTextblock) continue; // bloc supprimé depuis l'analyse
      const dom = editor.view.nodeDOM(a.pos);
      if (!(dom instanceof HTMLElement)) continue;
      const r = dom.getBoundingClientRect();
      items.push({ a, top: r.top - box.top, height: r.height, left: r.left - box.left });
    }
    const tops = stackLabels(items.map((i) => ({ top: i.top, height: LABEL_HEIGHT })), LABEL_GAP);
    setPlaced(items.map((i, k) => ({ ...i, labelTop: tops[k] })));
  }, [editor]);

  // Mesures groupées dans une frame après chaque changement
  useLayoutEffect(() => nextFrame(measure), [measure, version, visible]);

  useEffect(() => {
    const wrap = layer.current?.parentElement;
    const sheet = wrap?.querySelector(".sheet");
    const main = wrap?.closest("main");
    if (!wrap || !sheet) return;
    const ro = new ResizeObserver(() => nextFrame(measure));
    ro.observe(sheet);
    if (main) ro.observe(main);
    const onLoad = (e: Event) => {
      if (e.target instanceof HTMLImageElement) nextFrame(measure);
    };
    wrap.addEventListener("load", onLoad, true);
    return () => {
      ro.disconnect();
      wrap.removeEventListener("load", onLoad, true);
    };
  }, [measure]);

  const enter = (a: BlockAnnotation) => {
    setFocusIds(a.detectionIds);
    if (editor && a.signalRanges.length) editor.view.dispatch(setSignalHighlight(editor.state, a.signalRanges));
  };

  const leave = (a: BlockAnnotation) => {
    setFocusIds([]);
    if (!editor || !a.signalRanges.length) return;
    // Rend la main au surlignage choisi dans le panneau
    const signal = highlighted ? result?.signals.find((s) => s.id === highlighted) : undefined;
    const index = buildTextIndex(editor.state.doc);
    const ranges = signal && index.text === sourceText ? mapRanges(index, signal.ranges) : null;
    editor.view.dispatch(setSignalHighlight(editor.state, ranges));
  };

  return (
    <div ref={layer} className="no-print absolute inset-0 pointer-events-none" aria-label="Étiquettes d'analyse">
      {focusIds.length > 0 && (
        <style>
          {focusIds.map((id) => `.to-marker[data-detection-id="${CSS.escape(id)}"]`).join(",") +
            "{outline:2px solid #b8411d;outline-offset:1px}"}
        </style>
      )}
      {visible &&
        placed.map(({ a, top, height, left, labelTop }) => {
          const markers = a.markerCount > 0;
          const bar = markers ? LEVEL_BAR[a.maxLevel ?? "low"] : "bg-rail";
          return (
            <React.Fragment key={a.pos}>
              <span className={`absolute w-[3px] rounded-full ${bar}`} style={{ top, height, left: left - 12 }} aria-hidden="true" />
              <button
                type="button"
                aria-label={ariaText(a)}
                title={ariaText(a)}
                onMouseEnter={() => enter(a)}
                onMouseLeave={() => leave(a)}
                onFocus={() => enter(a)}
                onBlur={() => leave(a)}
                onClick={() => onFocus(a)}
                className={`pointer-events-auto absolute flex items-center gap-1 font-ui text-[9px] font-bold tracking-wide leading-tight rounded-md px-1.5 py-1 shadow-soft text-left hover:brightness-110 ${
                  markers ? `${LEVEL_BG[a.maxLevel ?? "low"]} text-accent-ink` : "bg-rail text-white"
                }`}
                style={
                  gutter
                    ? { top: labelTop, right: "calc(100% + 14px)", maxWidth: 110 }
                    : { top: labelTop, left: 8, maxWidth: Math.max(48, left - 26) }
                }
              >
                <span>{labelText(a)}</span>
                {markers && a.signals.length > 0 && <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-rail" aria-hidden="true" />}
              </button>
            </React.Fragment>
          );
        })}
    </div>
  );
};
