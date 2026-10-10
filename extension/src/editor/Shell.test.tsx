// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useLayout } from "./Shell";
import { LAYOUT_KEY } from "./layout";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderLayout(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  const out: { current: ReturnType<typeof useLayout> | null } = { current: null };
  const Probe = () => {
    out.current = useLayout();
    return null;
  };
  act(() => createRoot(document.createElement("div")).render(<Probe />));
  return out;
}

describe("useLayout.openDocs", () => {
  beforeEach(() => localStorage.clear());

  it("ouvre le tiroir Documents sans toucher à la préférence d'épinglage (1300 px)", () => {
    const l = renderLayout(1300);
    act(() => l.current!.openDocs());
    expect(l.current!.layout.docs).toBe("drawer");
    expect(l.current!.docsOpen).toBe(true);
    expect(localStorage.getItem(LAYOUT_KEY)).toBeNull();
  });

  it("ne fait rien si la colonne est déjà épinglée (1600 px)", () => {
    const l = renderLayout(1600);
    act(() => l.current!.openDocs());
    expect(l.current!.layout.docs).toBe("pinned");
    expect(l.current!.docsOpen).toBe(false);
    expect(localStorage.getItem(LAYOUT_KEY)).toBeNull();
  });
});
