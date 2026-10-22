import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AnalysisResult, AnalyzeRequest, AnalyzeResponse } from "../types/types";
import { create } from "../storage/documents";
import { Button, Card } from "../ui/primitives";
import { ScoreGauge } from "../ui/ScoreGauge";
import { ILogo } from "../ui/icons";
import { initLang, t, tn, useLang, type Key } from "../i18n";
import "./global.css";

/**
 * Dernière sélection analysée, réaffichée à la réouverture du popup. Gardée en
 * stockage de session : le texte d'une page ne survit pas au navigateur.
 */
const STORAGE_KEY = "textorigin:selection";

const App: React.FC = () => {
  useLang();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // anciennes versions : la sélection était gardée sans limite de durée
    chrome.storage.local.remove(STORAGE_KEY);
    chrome.storage.session.get(STORAGE_KEY).then((items) => {
      const text = items[STORAGE_KEY];
      if (typeof text === "string" && text.length > 0) {
        analyze(text);
      }
    });
  }, []);

  const analyze = async (text: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await new Promise<AnalysisResult>((resolve, reject) => {
        chrome.runtime.sendMessage<AnalyzeRequest, AnalyzeResponse | undefined>(
          { type: "ANALYZE_TEXT", text },
          (response) => {
            if (chrome.runtime.lastError)
              reject(new Error(chrome.runtime.lastError.message));
            else if (response?.type === "ANALYSIS_READY") resolve(response.result);
            else if (response?.type === "ANALYSIS_ERROR")
              reject(new Error(response.error || t("popup.err.analysisFailed")));
            else reject(new Error(t("popup.err.badResponse")));
          },
        );
      });
      setResult(res);
      chrome.storage.session.set({ [STORAGE_KEY]: text });
    } catch (e) {
      const msg = (e as Error).message || t("popup.err.unknown");
      setError(msg);
      console.error("[TextOrigin] analyse error:", msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Lit la sélection de l'onglet actif par injection à la demande
   * (autorisée par activeTab), dans tous les cadres.
   */
  const getPageSelection = async (): Promise<string> => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) throw new Error(t("popup.err.noTab"));
    try {
      const injections = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => {
          const active = document.activeElement;
          if (
            active instanceof HTMLTextAreaElement ||
            (active instanceof HTMLInputElement && active.type === "text")
          ) {
            const { selectionStart: s, selectionEnd: e, value } = active;
            if (s != null && e != null && e > s) return value.slice(s, e);
          }
          return window.getSelection()?.toString() ?? "";
        },
      });
      const found = injections.find(
        (i) => typeof i.result === "string" && i.result.trim(),
      );
      return (found?.result as string) ?? "";
    } catch (e) {
      console.warn("[TextOrigin] injection impossible:", e);
      throw new Error(t("popup.err.protectedPage"));
    }
  };

  const handleAnalyze = async () => {
    if (loading) return;
    setError(null);

    let text: string;
    try {
      text = (await getPageSelection()).trim();
    } catch (e) {
      setError((e as Error).message);
      return;
    }

    if (!text) {
      setError(t("popup.err.noSelection"));
      return;
    }

    setResult(null);
    analyze(text);
  };

  const [opening, setOpening] = useState(false);

  /** Crée un document à partir de la sélection (ou vide) et l'ouvre dans l'éditeur. */
  const handleOpenEditor = async () => {
    if (opening) return;
    setOpening(true);
    let text = "";
    try {
      text = (await getPageSelection()).trim();
    } catch {
      // page protégée : on ouvre un document vide
    }
    try {
      const doc = await create({ text });
      await chrome.tabs.create({ url: chrome.runtime.getURL(`src/editor/index.html?doc=${doc.id}`) });
      window.close();
    } catch (e) {
      setError(t("popup.err.openEditor", { message: (e as Error).message }));
      setOpening(false);
    }
  };

  const confidenceLabel = (c: string) => t(`popup.reliability.${c}` as Key);

  return (
    <div className="w-80 min-h-[320px] bg-canvas p-3 font-ui text-ink space-y-3">
      <header className="flex items-center gap-2 px-1 pt-1">
        <ILogo className="w-6 h-6 text-accent" />
        <h1 className="text-[15px] font-semibold">TextOrigin AI</h1>
      </header>

      <Card className="p-3 space-y-2">
        <Button onClick={handleAnalyze} disabled={loading} aria-label={t("popup.analyzeLabel")} className="w-full">
          {loading ? t("popup.analyzing") : t("popup.analyze")}
        </Button>
        <Button
          variant="secondary"
          onClick={handleOpenEditor}
          disabled={opening}
          aria-label={t("popup.openLabel")}
          className="w-full"
        >
          {opening ? t("popup.opening") : t("popup.openEditor")}
        </Button>
      </Card>

      {loading && (
        <p className="text-2xs text-muted px-1" role="status">
          {t("popup.analyzing")}
        </p>
      )}

      {error && (
        <p className="rounded-card border border-accent/50 bg-accent/10 p-2.5 text-2xs" role="alert">
          {error}
        </p>
      )}

      {result && (
        <Card className="p-4 space-y-3" aria-live="polite">
          <ScoreGauge score={result.totalScore} size="md" />
          <div className="space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <span>{t("popup.markers")}</span>
              <span className="font-medium">{result.markerCount}</span>
            </div>
            <div className="flex justify-between">
              <span title={t("popup.reliability.hint")}>{t("popup.reliability")}</span>
              <span className="font-medium">{confidenceLabel(result.confidence)}</span>
            </div>
            {result.invisibles.total > 0 && (
              <div className={result.invisibles.suspects ? "text-accent-text" : ""}>
                <div className="flex justify-between">
                  <span>{t("popup.invisibles")}</span>
                  <span className="font-medium">
                    {result.invisibles.total}
                    {result.invisibles.suspects > 0 && tn("popup.suspects", result.invisibles.suspects)}
                  </span>
                </div>
                {result.invisibles.suspects > 0 && (
                  <p className="text-2xs mt-1">{t("popup.hiddenWarning")}</p>
                )}
              </div>
            )}
          </div>
          <p className="text-2xs text-muted">
            {t("popup.disclaimer")}
          </p>
        </Card>
      )}
    </div>
  );
};

initLang();
createRoot(document.getElementById("root")!).render(<App />);
export {};