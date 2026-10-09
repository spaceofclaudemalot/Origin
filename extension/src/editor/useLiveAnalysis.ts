import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { AnalysisResult } from "../types/types";
import { buildTextIndex, toRanges } from "../analysis/positions";
import { analysisDelay, createLatestOnly } from "../analysis/live";
import { createDetectorService } from "../analysis/service";
import { setMarkers } from "./extensions/AiMarkers";

export type AnalysisState = "empty" | "running" | "ready" | "error";

const service = createDetectorService();

/**
 * Analyse différée du document : le détecteur tourne dans la page, sans
 * passer par le background. Une réponse dépassée par une frappe plus
 * récente est ignorée.
 */
export function useLiveAnalysis(editor: Editor | null) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [state, setState] = useState<AnalysisState>("empty");
  const [sourceText, setSourceText] = useState("");

  useEffect(() => {
    if (!editor) return;
    const latest = createLatestOnly<AnalysisResult>();
    let timer: number | undefined;

    const run = async () => {
      if (editor.isDestroyed) return;
      const index = buildTextIndex(editor.state.doc);
      if (!index.text.trim()) {
        latest.cancel();
        editor.view.dispatch(setMarkers(editor.state, []));
        setResult(null);
        setSourceText("");
        setState("empty");
        return;
      }
      setState("running");
      try {
        const { stale, value } = await latest.run(() => service.detectAll(index.text));
        if (stale || editor.isDestroyed) return;
        const fresh = buildTextIndex(editor.state.doc);
        if (fresh.text !== index.text) return; // le texte a changé : une autre analyse suit
        editor.view.dispatch(setMarkers(editor.state, toRanges(fresh, value.detections)));
        setResult(value);
        setSourceText(fresh.text);
        setState("ready");
      } catch (e) {
        console.error("[TextOrigin] analyse impossible:", e);
        setState("error");
      }
    };

    const onUpdate = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, analysisDelay(editor.state.doc.textContent.length));
    };

    editor.on("update", onUpdate);
    void run();
    return () => {
      window.clearTimeout(timer);
      latest.cancel();
      editor.off("update", onUpdate);
    };
  }, [editor]);

  return { result, state, sourceText };
}
