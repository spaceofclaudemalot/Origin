# Hyperframes Composition Brief: TextOrigin AI

## Objective
Create a short launch-style brag video for TextOrigin AI, a Chrome extension that detects AI-generated text by identifying stylistic markers.

## Output
- Composition directory: `brag-output-2026-10-06-230014/composition/`
- Rendered video: `brag-output-2026-10-06-230014/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 18 seconds

## Source Material
- Project root: `C:\Users\ori\Documents\GitHub\Origin\extension`
- Primary files read: `manifest.json`, `src/popup/index.tsx`, `src/content/index.ts`, `src/content/styles.css`
- Product name: TextOrigin AI
- Tagline / strongest claim: "Identifiez les marqueurs stylistiques des textes générés par l'IA"
- Key UI or visual moment to recreate: The floating purple Analyze button (#4f46e5), the colored highlight markers (orange/purple/blue/yellow), the popup score card with AI Marker Score
- Copy that must appear verbatim:
  - "AI Marker Score"
  - "Score : 73 — Confiance : Moyenne"
  - "Détectez l'IA. Installez TextOrigin."

## Creative Direction
- Tone preset: `app-store`
- Creative direction: Quiet premium product film — the serious side of AI detection, delivered with polish.
- Interpretation: Clean typography, restrained motion, confident delivery. No chaos, no generic SaaS language. Show the actual UI working: text selection → analyze → score reveal.
- Angle: The extension quietly reveals AI fingerprints in text — a serious tool with a polished reveal.
- Hook: "AI wrote this?" — cursor selects text, floating purple button appears on any page.
- Outro / punchline: "Détectez l'IA. Installez TextOrigin."
- Avoid:
  - Generic SaaS language ("streamline your workflow")
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity
- Background: white (#ffffff) to dark gray (#1f2937) gradient
- Text: #111827 on light, #f9fafb on dark
- Accent: #4f46e5 (purple) — the extension's primary action color
- Display font: system-ui, -apple-system, sans-serif (no Google Fonts in project)
- Body font: system-ui, sans-serif
- Visual references from the project: floating purple Analyze button, colored highlight markers, score card popup with big score number

## Storyboard
Use the storyboard in `brag-output-2026-10-06-230014/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 2s — Cursor selects text on a webpage; floating purple Analyze button appears
2. Reveal — 2s — TextOrigin AI popup opens with "Analyze" button click
3. Highlight 1 — 4s — Orange marker appears on detected AI text
4. Highlight 2 — 4s — Score card reveals: "Score : 73 — Confiance : Moyenne"
5. Outro — 6s — Floating button + Chrome Web Store badge + CTA text

## Audio
- Audio role: warm bed with subtle UI accents
- Audio arc: Music fades in at start, steady during analysis, soft fade under final CTA
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (1:58, steady and clean — fits app-store tone)
- Music treatment: volume 0.35, fade under final logo at 16s, full stop by 18s
- Music cue guidance: vol-12 cues available — `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` — use strongCues for major reveals (score card, logo), beats for sequential card pop-ins
- Audio-reactive treatment: subtle; use music RMS/bass to make the hero glow and product card presence breathe. No waveform/equalizer visuals.
- Audio-coupled moments:
  - Score reveal — beat-locked to strong cue near 8s
  - Card pop-ins — beat-grid sequential at 4s, 6s, 8s
  - Logo outro — impactBell_heavy_000 at 16s
- SFX selection guidance: app-store energy — use `interface/drop_*` for card pop-ins, `interface/click_*` for button taps, `impactBell_heavy_000` for final CTA. All at 0.65-0.75 volume.
- SFX analysis guidance: use lower high-frequency-risk sounds for polished moments (drop_001, click_001, bong_001).
- Exact SFX Choice: Hyperframes should choose filenames, timestamps, density, and volume based on the implemented animation.
- Audio files: copied to `composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project.
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds.
- Include the planned music/SFX layer unless audio was explicitly disabled or documented as intentionally silent.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints. Hyperframes decides exact animation timing and should ignore cues that hurt readability, scene pacing, or the product story.
- Major reveals may move toward nearby strong cues within about 0.15s. Smaller entrances may align to nearby beat points within about 0.10s. Use only 1-3 strong cue locks in a 15-25s video unless the edit clearly benefits from more.
- Use SFX to support motion and interaction: card sounds for card-like reveals, short announcement cues for major payoffs, key/click sounds for text or user actions, and restraint when the edit is already busy.
- Honor planned music treatment such as fade-outs, ducking, beat-aligned reveals, or letting a final SFX ring over the music, using the best Hyperframes-supported implementation.
- When music is present and the treatment is not `none`, consider Hyperframes audio-reactive workflow: extract audio data and use RMS/frequency bands for subtle, brand-specific motion. Good targets are glow, depth, background warmth, card presence, title emphasis, or other existing visual elements. Avoid waveform/equalizer visuals, musical-note graphics, generic particle systems, strobing, or heavy pulsing.
- Use local assets for audio and any required runtime/media dependencies when possible.
- Run `hyperframes check` before render — it is brag's single gate.
- Keep creation and rendering local. Remote or publishing workflows require a separate explicit user request.
