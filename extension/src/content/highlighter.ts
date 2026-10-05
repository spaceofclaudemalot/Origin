import type { Detection, DetectionCategory } from "../types/types";

const COLOR_MAP: Record<DetectionCategory, string> = {
  "lexical-marker": "bg-highlight-orange",
  "discourse-structure": "bg-highlight-purple",
  transition: "bg-highlight-orange",
  "style-regularity": "bg-highlight-blue",
  anomaly: "bg-highlight-yellow",
};

export interface HighlightOptions {
  overlay?: boolean;
}

export function highlightText(
  detections: Detection[],
  _options: HighlightOptions = {},
): void {
  clearHighlights();

  if (!detections.length) return;

  // Sort by start position
  const sorted = [...detections].sort((a, b) => a.start - b.start);

  // We'll walk the DOM and build a mapping of text node -> content
  const textNodes: Text[] = [];
  const textNodeContents: string[] = [];

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip nodes inside our own highlights or script/style
        const parent = node.parentElement;
        if (parent?.closest("[data-textorigin-marker]") ||
            parent?.tagName === "SCRIPT" ||
            parent?.tagName === "STYLE") {
          return NodeFilter.FILTER_REJECT;
        }
        return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    },
  );

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    textNodes.push(node);
    textNodeContents.push(node.textContent!);
  }

  // Build a flat string of all text content with position mapping
  let offset = 0;
  const positionMap: Array<{ node: Text; start: number; end: number }> = [];
  for (let i = 0; i < textNodes.length; i++) {
    const len = textNodeContents[i].length;
    positionMap.push({ node: textNodes[i], start: offset, end: offset + len });
    offset += len;
  }

  // Find which text node each detection belongs to
  const placements: Array<{
    node: Text;
    nodeStart: number;  // offset within the text node
    nodeEnd: number;
    detection: Detection;
  }> = [];

  for (const det of sorted) {
    for (const pm of positionMap) {
      if (det.start >= pm.start && det.end <= pm.end) {
        placements.push({
          node: pm.node,
          nodeStart: det.start - pm.start,
          nodeEnd: det.end - pm.start,
          detection: det,
        });
        break;
      }
    }
  }

  // Apply highlights - process in reverse order to maintain offsets
  placements.sort((a, b) => b.nodeStart - a.nodeStart);

  for (const { node, nodeStart, nodeEnd, detection } of placements) {
    const span = document.createElement("span");
    span.dataset.textoriginMarker = "true";
    span.dataset.markerId = detection.id;
    span.className = `rounded-sm px-0.5 ${COLOR_MAP[detection.category]} cursor-pointer`;
    span.title = "Marqueur détecté";

    const beforeText = node.textContent!.slice(0, nodeStart);
    const matchText = node.textContent!.slice(nodeStart, nodeEnd);
    const afterText = node.textContent!.slice(nodeEnd);

    const parent = node.parentNode!;
    const frag = document.createDocumentFragment();

    if (beforeText) frag.appendChild(document.createTextNode(beforeText));

    const mark = span.cloneNode() as HTMLSpanElement;
    mark.textContent = matchText;
    mark.addEventListener("mouseenter", () => showTooltip(mark, detection));
    mark.addEventListener("mouseleave", hideTooltip);
    frag.appendChild(mark);

    if (afterText) frag.appendChild(document.createTextNode(afterText));

    parent.replaceChild(frag, node);
  }
}

export function clearHighlights(): void {
  document.querySelectorAll("[data-textorigin-marker]").forEach((el) => {
    const parent = el.parentNode!;
    // Replace the highlighted span with its text content
    parent.replaceChild(document.createTextNode(el.textContent!), el);
  });
}

let tooltip: HTMLDivElement | null = null;

function showTooltip(anchor: HTMLSpanElement, detection: Detection): void {
  hideTooltip();

  tooltip = document.createElement("div");
  tooltip.id = "textorigin-tooltip";
  tooltip.style.cssText = `
    position: absolute; z-index: 2147483641; max-width: 280px; padding: 12px;
    background: #1f2937; color: #fff; border-radius: 8px; font-size: 13px; line-height: 1.4;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2); pointer-events: none;
  `;

  const catLabel: Record<DetectionCategory, string> = {
    "lexical-marker": "Marqueur lexical",
    "discourse-structure": "Structure discursive",
    transition: "Connecteur excessif",
    "style-regularity": "Régularité stylistique",
    anomaly: "Anomalie stylistique",
  };

  tooltip.innerHTML = `
    <div class="font-semibold mb-1">Marqueur détecté</div>
    <div style="color: #93c5fd; font-size: 12px; margin-bottom: 8px;">${catLabel[detection.category]}</div>
    <div style="font-size: 11px; opacity: 0.9; margin-bottom: 8px;">${detection.explanation}</div>
    ${detection.suggestions.length
      ? `<div style="font-size: 11px; opacity: 0.75;">Suggestion : ${detection.suggestions[0].text}</div>`
      : ""
    }
  `;

  const rect = anchor.getBoundingClientRect();
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
  document.body.appendChild(tooltip);
}

function hideTooltip(): void {
  tooltip?.remove();
  tooltip = null;
}