import React from "react";
import { getLang, setLang, t, useLang } from "../i18n";

/**
 * Bascule FR / EN, dans le rail de l'éditeur. La langue active est en gras ; un clic passe
 * à l'autre et mémorise le choix (popup et éditeur partagent le même stockage).
 */
export const LangSwitch: React.FC = () => {
  const lang = useLang();
  const next = lang === "fr" ? "en" : "fr";
  const label = t(next === "en" ? "lang.toEn" : "lang.toFr");
  const code = (l: "fr" | "en") => (
    <span className={l === lang ? "text-white" : "text-white/50"}>{l.toUpperCase()}</span>
  );
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => setLang(getLang() === "fr" ? "en" : "fr", true)}
      className="mt-auto w-10 h-10 rounded-card inline-flex items-center justify-center gap-0.5 text-[11px] font-bold tracking-wide hover:bg-white/10 transition-[background-color,transform] duration-150 ease-ui motion-safe:active:scale-[0.97]"
    >
      {code("fr")}
      <span className="text-white/30" aria-hidden="true">/</span>
      {code("en")}
    </button>
  );
};
