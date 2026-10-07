import type { Detection, DetectionCategory } from "../types/types";

const COLOR_MAP: Record<DetectionCategory, string> = {
  "lexical-marker": "bg-highlight-orange",
  "discourse-structure": "bg-highlight-purple",
  transition: "bg-highlight-orange",
  "style-regularity": "bg-highlight-blue",
  anomaly: "bg-highlight-yellow",
};

const CATEGORY_LABEL: Record<DetectionCategory, string> = {
  "lexical-marker": "Marqueur lexical",
  "discourse-structure": "Structure discursive",
  transition: "Connecteur excessif",
  "style-regularity": "Régularité stylistique",
  anomaly: "Anomalie stylistique",
};

interface Segment {
  node: Text;
  from: number; // début de la portion sélectionnée dans le nœud
  to: number; // fin de la portion sélectionnée dans le nœud
}

interface Placement {
  start: number;
  end: number;
  detection: Detection;
}

/**
 * Collecte les nœuds texte couverts par la plage sélectionnée.
 */
function collectSegments(range: Range): Segment[] {
  const root =
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode!
      : range.commonAncestorContainer;

  const segments: Segment[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (
        parent?.closest("[data-textorigin-marker]") ||
        parent?.tagName === "SCRIPT" ||
        parent?.tagName === "STYLE" ||
        !range.intersectsNode(node)
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const from = node === range.startContainer ? range.startOffset : 0;
    const to = node === range.endContainer ? range.endOffset : node.length;
    if (to > from) segments.push({ node, from, to });
  }
  return segments;
}

/**
 * Surligne les détections dans la sélection d'origine.
 * Les positions des détections sont relatives au texte analysé ; on retrouve
 * chaque extrait dans les nœuds de la plage, dans l'ordre. Les extraits qui
 * chevauchent plusieurs nœuds sont ignorés.
 */
export function highlightText(
  text: string,
  detections: Detection[],
  range: Range,
): void {
  clearHighlights();
  if (!detections.length) return;

  const segments = collectSegments(range);
  const placements = new Map<Text, Placement[]>();

  // Curseur de recherche : index du segment + position dans le nœud
  let segIdx = 0;
  let pos = segments[0]?.from ?? 0;

  const sorted = [...detections].sort((a, b) => a.start - b.start);
  for (const detection of sorted) {
    const needle = text.slice(detection.start, detection.end);
    if (!needle.trim()) continue;

    for (let i = segIdx; i < segments.length; i++) {
      const seg = segments[i];
      const searchFrom = i === segIdx ? Math.max(pos, seg.from) : seg.from;
      const found = seg.node.data.indexOf(needle, searchFrom);
      if (found !== -1 && found + needle.length <= seg.to) {
        const list = placements.get(seg.node) ?? [];
        list.push({ start: found, end: found + needle.length, detection });
        placements.set(seg.node, list);
        segIdx = i;
        pos = found + needle.length;
        break;
      }
    }
  }

  for (const [node, list] of placements) {
    wrapNode(node, list);
  }
}

/**
 * Remplace un nœud texte par un fragment contenant tous ses marqueurs.
 */
function wrapNode(node: Text, list: Placement[]): void {
  const parent = node.parentNode;
  if (!parent) return;

  const data = node.data;
  const frag = document.createDocumentFragment();
  let cursor = 0;

  for (const { start, end, detection } of list) {
    if (start > cursor) {
      frag.appendChild(document.createTextNode(data.slice(cursor, start)));
    }
    const mark = document.createElement("span");
    mark.dataset.textoriginMarker = "true";
    mark.dataset.markerId = detection.id;
    mark.className = COLOR_MAP[detection.category];
    mark.textContent = data.slice(start, end);
    mark.addEventListener("mouseenter", () => showTooltip(mark, detection));
    mark.addEventListener("mouseleave", hideTooltip);
    frag.appendChild(mark);
    cursor = end;
  }
  if (cursor < data.length) {
    frag.appendChild(document.createTextNode(data.slice(cursor)));
  }

  parent.replaceChild(frag, node);
}

export function clearHighlights(): void {
  hideTooltip();
  const parents = new Set<Node>();
  document.querySelectorAll("[data-textorigin-marker]").forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(el.textContent ?? ""), el);
    parents.add(parent);
  });
  // Fusionne les nœuds texte découpés pour les analyses suivantes
  parents.forEach((p) => p.normalize());
}

let tooltip: HTMLDivElement | null = null;

function showTooltip(anchor: HTMLSpanElement, detection: Detection): void {
  hideTooltip();

  tooltip = document.createElement("div");
  tooltip.id = "textorigin-tooltip";
  tooltip.style.cssText = `
    position: fixed; z-index: 2147483641; max-width: 280px; padding: 12px;
    background: #1f2937; color: #fff; border-radius: 8px; font-size: 13px; line-height: 1.4;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2); pointer-events: none;
  `;

  // Construction DOM (pas d'innerHTML) : le contenu provient du texte de la page
  const title = document.createElement("div");
  title.style.cssText = "font-weight: 600; margin-bottom: 4px;";
  title.textContent = "Marqueur détecté";

  const category = document.createElement("div");
  category.style.cssText = "color: #93c5fd; font-size: 12px; margin-bottom: 8px;";
  category.textContent = CATEGORY_LABEL[detection.category];

  const explanation = document.createElement("div");
  explanation.style.cssText = "font-size: 11px; opacity: 0.9; margin-bottom: 8px;";
  explanation.textContent = detection.explanation;

  tooltip.append(title, category, explanation);

  if (detection.suggestions.length) {
    const suggestion = document.createElement("div");
    suggestion.style.cssText = "font-size: 11px; opacity: 0.75;";
    suggestion.textContent = `Suggestion : ${detection.suggestions[0].text}`;
    tooltip.appendChild(suggestion);
  }

  // Ajout avant mesure : offsetHeight vaut 0 tant que l'élément est détaché
  document.body.appendChild(tooltip);
  const rect = anchor.getBoundingClientRect();
  const top = rect.top - tooltip.offsetHeight - 8;
  tooltip.style.left = `${Math.max(8, rect.left)}px`;
  tooltip.style.top = `${top < 8 ? rect.bottom + 8 : top}px`;
}

function hideTooltip(): void {
  tooltip?.remove();
  tooltip = null;
}
