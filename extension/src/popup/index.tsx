import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AnalysisResult } from "../types/types";
import "./global.css";

const STORAGE_KEY = "textorigin:selection";

const App: React.FC = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (items) => {
      const text = items[STORAGE_KEY];
      if (text && text.length > 0) {
        analyze(text);
      }
    });
  }, []);

  const analyze = async (text: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await new Promise<AnalysisResult>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "ANALYZE_TEXT", text },
          (response: any) => {
            if (response?.type === "ANALYSIS_READY") resolve(response.result);
            else reject(new Error(response?.error || "Analyse échouée."));
          },
        );
      });
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    let text = window.getSelection()?.toString() ?? "";
    console.log('handleAnalyze: popup selection =', text);
    if (!text.trim()) {
      try {
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        console.log('handleAnalyze: tabs =', tabs);
        const tabId = tabs[0]?.id;
        if (tabId != null) {
          const res: any = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tabId, {type: "GET_PAGE_SELECTION"}, (r) => {
              console.log('handleAnalyze: content script response =', r);
              resolve(r);
            });
          });
          if (res?.text) text = res.text;
        }
      } catch (e) {
        console.error('handleAnalyze: error requesting page selection =', e);
      }
    }
    console.log('handleAnalyze: final text =', text);
    if (!text.trim()) {
      setError("Veuillez sélectionner du texte sur la page.");
      return;
    }
    analyze(text);
  };

  const scoreColor = (score: number) =>
    score < 21
      ? "text-natural-500"
      : score < 41
      ? "text-primary-500"
      : score < 61
      ? "text-verify-500"
      : "text-alert-500";

  return (
    <div className="min-h-[320px] w-80 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 font-sans">
      <header className="flex items-center gap-2 mb-4">
        <svg
          className="w-8 h-8 text-primary-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeWidth="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
          <path
            strokeWidth="2"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <h1 className="text-lg font-bold text-primary-700 dark:text-primary-400">
          TextOrigin AI
        </h1>
      </header>

      <div className="space-y-4">
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? "Analyse en cours..." : "Analyze"}
        </button>

        {loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analyse en cours...
          </p>
        )}

        {error && <p className="text-sm text-alert-500">{error}</p>}

        {result && (
          <div className="border rounded-lg p-4 dark:border-gray-700">
            <div className="text-center mb-3">
              <div
                className={`text-4xl font-bold ${scoreColor(result.totalScore)}`}
              >
                {result.totalScore}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                AI Marker Score
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Marqueurs détectés</span>
                <span className="font-medium">{result.markerCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Confiance</span>
                <span className="font-medium capitalize">
                  {result.confidence}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Score de présence de marqueurs stylistiques fréquemment observés
                dans des textes générés par des LLM.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
export {};