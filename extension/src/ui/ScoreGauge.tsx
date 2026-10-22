import React from "react";
import { bandLabel, scoreBand, type ScoreBand } from "./score";
import { t, useLang } from "../i18n";
import { Chip } from "./primitives";

const BANDS: ScoreBand[] = ["low", "mid", "notable", "high"];
const SEGMENT: Record<ScoreBand, string> = {
  low: "bg-band-low",
  mid: "bg-band-mid",
  notable: "bg-band-notable",
  high: "bg-accent",
};

/** Score global : grand chiffre léger, puce de bande et jauge à quatre segments. */
export const ScoreGauge: React.FC<{ score: number; size?: "lg" | "md"; caption?: React.ReactNode }> = ({
  score, size = "lg", caption,
}) => {
  useLang();
  const band = scoreBand(score);
  return (
    <div className="space-y-2.5">
      <div className="text-2xs font-medium text-muted">{t("score.title")}</div>
      <div className="flex items-end gap-2.5">
        <span className={size === "lg" ? "text-score" : "text-[32px] leading-none font-light tracking-tight"}>{score}</span>
        <span className="text-[13px] text-muted pb-1">/100</span>
        <span className="flex-1" />
        {band === "high" ? (
          <Chip tone="accent">{bandLabel(band)}</Chip>
        ) : (
          <Chip className={`${SEGMENT[band]} text-ink`}>{bandLabel(band)}</Chip>
        )}
      </div>
      <div className="flex gap-1" aria-hidden="true">
        {BANDS.map((b) => (
          <span key={b} className={`h-1.5 flex-1 rounded-full transition-opacity duration-150 ease-ui ${SEGMENT[b]} ${b === band ? "" : "opacity-30"}`} />
        ))}
      </div>
      {caption && <div className="text-2xs text-muted">{caption}</div>}
    </div>
  );
};
