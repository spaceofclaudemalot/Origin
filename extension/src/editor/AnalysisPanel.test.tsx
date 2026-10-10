// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AnalysisPanel, type PanelFocus } from "./AnalysisPanel";
import type { AnalysisResult, Detection } from "../types/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const det: Detection = {
  id: "d1", type: "lexical", category: "lexical-marker", text: "essentiel", start: 0, end: 9,
  score: 50, confidence: 0.7, explanation: "", suggestions: [],
};
const result = {
  totalScore: 40, confidence: "low", markerCount: 1, categories: {}, detections: [det], families: [], signals: [],
  wordCount: 1, invisibles: { findings: [], total: 0, suspects: 0 },
} as unknown as AnalysisResult;

describe("AnalysisPanel focus", () => {
  it("signale qu'une demande de focus a été consommée (pas de rejeu au remontage)", () => {
    const onFocusSeen = vi.fn();
    const focus: PanelFocus = { nonce: 1, detectionIds: ["d1"], signals: [] };
    act(() =>
      createRoot(document.createElement("div")).render(
        <AnalysisPanel
          editor={null}
          analysis={{ result, state: "ready", sourceText: "essentiel" }}
          highlighted={null}
          onHighlight={() => {}}
          focus={focus}
          onFocusSeen={onFocusSeen}
          onVisibleChange={() => {}}
        />,
      ),
    );
    expect(onFocusSeen).toHaveBeenCalledTimes(1);
  });
});
