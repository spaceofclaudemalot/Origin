# TextOrigin AI

A Chrome extension (Manifest V3) that spots the stylistic markers often associated with LLM-generated text, highlights them in a built-in editor, explains each one and suggests rewrites.

> Stylistic hints, not proof. Formal academic writing and text by non-native authors can trigger false positives. The score never says "written by an AI".

Everything runs locally: no network calls, no LLM.

It analyzes **English and French** text. The interface itself is in French for now, and so are the design docs under `docs/`.

## What it detects

The overall score (0 to 100) combines four families of signals:

| Family | Weight | Examples |
|---|---|---|
| Vocabulary | 30 % | `delve`, `tapestry`, `holistic`, « crucial », « holistique », « tapisserie », « paysage numérique » |
| Connectors | 20 % | density of `furthermore`, `moreover`, « de plus », « en outre » |
| Phrasing | 25 % | rule-of-three lists, "not just X, it's Y" (« Ce n'est pas seulement X, c'est Y »), chatbot openers and closers |
| Regularity | 25 % | sentence rhythm, paragraph uniformity |

The score's reliability is "high" when at least three families are in alert, "medium" with two, and "limited" otherwise or when the text is too short. Rules specific to one language are not applied to the other. Invisible characters (zero-width spaces and the like) are flagged too.

The pattern catalogue draws on [blader/humanizer](https://github.com/blader/humanizer) (MIT). Integration details are in [`docs/superpowers/specs/2026-10-20-humanizer-design.md`](docs/superpowers/specs/2026-10-20-humanizer-design.md) (in French).

## Install

```bash
cd extension
npm install
npm run build
```

Then in Chrome: `chrome://extensions` → turn on Developer mode → "Load unpacked" → pick the `extension/dist` folder.

The popup analyzes the current selection; the editor (`src/editor`) opens in a tab.

## Development

Run these from the `extension/` folder:

```bash
npm run dev        # Vite server, editor at http://localhost:5173/src/editor/index.html
npm test           # unit tests (Vitest)
npm run test:perf  # performance tests
npm run lint
```

The dev server does not provide the `chrome.*` APIs, so only the editor works there, not the popup. GitHub Actions runs the tests and the build on every pull request.

## Project layout

- `extension/src/detectors/`: one detector per family (`lexical`, `connectors`, `stereotypes`, `rhythm`, `paragraphs`, `invisibles`) and their data.
- `extension/src/analysis/`: scoring, thresholds, segmentation, live analysis.
- `extension/src/editor/`, `extension/src/popup/`: user interfaces.
- `extension/src/background/`: service worker.
- `cahier_des_charges.md`: the original product brief (in French).
- `docs/superpowers/`: design specs and plans (in French).

## Feedback and bugs

The envelope button at the bottom of the editor's side rail opens your mail client with a pre-filled template addressed to claude.malot@creativeori.com. The message includes the extension version and your browser, never the analyzed text.

## License

[MIT](LICENSE) © 2026 Claude Malot. The Humanizer pattern catalogue this project draws on is also MIT-licensed.
