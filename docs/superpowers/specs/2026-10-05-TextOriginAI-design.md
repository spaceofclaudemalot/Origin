# TextOrigin AI - Design Document

## 1. Overview
- **Purpose**: Chrome extension that identifies AI-associated writing markers and provides editing suggestions.
- **Success**: Detect markers with confidence scores, highlight them, provide explanations and suggestions; user can edit text locally.

## 2. MVP Scope
- Detect lexical markers (e.g., "Furthermore", "delve", "underscores") in selected text.
- Highlight markers with color coding.
- Show explanation tooltip.
- Provide simple rewrite suggestions.
- Basic score display (0-100).
- Works on selected text and page content (via content script).

## 3. Architecture Overview
- **Popup UI** (React + TypeScript) – entry point, settings.
- **Content Script** – injects UI, handles selection, sends messages.
- **Background Service Worker** – manages messages, storage.
- **Detection Modules** (plugins) – independent detectors (Lexical, Structural, etc.).
- **Data Flow**:
  1. User selects text → content script captures selection.
  2. Content script sends selection to background via message.
  3. Background triggers detection modules (via messaging).
  4. Detectors return standardized detection objects.
  5. Background sends results back to content script.
  5. Content script highlights and displays suggestions.

## 4. Detection Modules (MVP)
- **Lexical Detector**: scans for known AI lexical markers (list configurable).
- **Structural Detector**: simple heuristics (sentence length, paragraph homogeneity).
- **Connectors Detector**: counts excessive transition words.
- **Stylistic Detector**: sentence length variation, lexical diversity.

Each detector returns objects with fields: type, category, text, start, end, score, confidence, explanation, suggestions.

## 5. UI/UX
- Popup shows AI Marker Score (e.g., 42/100), list of detected markers.
- Content script overlays highlights on page.
- Tooltip on hover with explanation and suggestions.
- Buttons: Apply (replace), Ignore, Edit, Rewrite.

## 6. Data Model
- Detection: {type, category, text, start, end, score, confidence, explanation, suggestions}
- Suggestion: {text, reason}
- User settings: whitelist terms, detection thresholds.

## 7. Implementation Phases
1. Set up project (Vite + React + TypeScript + Tailwind).
2. Build Chrome Manifest V3, basic popup and content script.
3. Implement lexical detector with sample list.
4. Implement highlighting and tooltip UI.
5. Add message passing between content script, background, detectors.
6. Implement basic scoring and summary UI.
6. Expand to document analysis (chunking) (future).

## 8. Error Handling
- Empty selection → show "No text selected".
- API/service errors → show friendly message, no crash.
- Content script errors → log to console, fallback.

## 9. Security & Privacy
- No data sent without user action.
- Local processing for simple detection.
- API calls only for advanced features (future).