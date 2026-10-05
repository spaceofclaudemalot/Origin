# E2E Manual Test Guide — TextOrigin AI Chrome Extension

## Prerequisites
- Chrome browser (latest)
- Extension built (`npm run build`)

## Setup
1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked** → select `extension/dist/` directory
4. Verify the extension appears with the TextOrigin AI icon

## Test Cases

### 1. Popup UI
- Click the extension icon
- Verify: "AI Marker Score" header, "Analyze" button, empty state

### 2. Empty Selection
- Click "Analyze" without selecting text
- Expected: toast/notification "Veuillez sélectionner du texte à analyser"

### 3. Short Text (1 word)
- Select a single word, click "Analyze"
- Expected: score 0–100 bounded, no crash

### 4. English Text — LLM Markers
- Select: "Furthermore, this comprehensive solution is indeed innovative."
- Expected: high score, markers highlighted in orange/purple

### 5. French Text — LLM Markers
- Select: "En outre, il convient de noter que cette approche permet de réussir."
- Expected: detection, score, French markers highlighted

### 6. Non-LLM Text
- Select: "The cat sat on the mat."
- Expected: low or zero score, no highlights

### 7. Tooltip Hover
- Hover over a highlighted marker
- Expected: tooltip with category label, explanation, suggestion (if any)

### 8. Score Boundaries
- Select long LLM-like text (50+ words)
- Expected: score 0–100, never exceeds 100

### 9. Clear Highlights
- Click "Analyze" again with different selection
- Expected: previous highlights removed, new ones applied

### 10. Reload Test
- Reload the page, re-select text, analyze
- Expected: no stale highlights, fresh analysis

## Notes
- All scores are integers 0–100 (never probabilities)
- Confidence levels: low / medium / high
- Toast notifications appear for empty/short selections
