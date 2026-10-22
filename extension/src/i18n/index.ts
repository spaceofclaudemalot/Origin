import { useSyncExternalStore } from "react";
import { getLang, subscribe, type Lang } from "./core";

export * from "./core";

/** À appeler dans tout composant qui affiche du texte traduit : il se redessine au changement de langue. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang);
}
