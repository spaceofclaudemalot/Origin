// Vérifie que le popup reste léger et que le content script a disparu.
import { readFileSync, existsSync } from "node:fs";

const failures = [];
// Le popup charge popup.js et les chunks partagés qu'il référence (modulepreload)
const popupHtml = readFileSync("dist/src/popup/index.html", "utf8");
const popupScripts = [...new Set(popupHtml.match(/assets\/[\w.-]+\.js/g) ?? [])];
for (const file of popupScripts) {
  const code = readFileSync(`dist/${file}`, "utf8");
  for (const needle of ["@tiptap", "prosemirror", "ProseMirror", "Packer.toBlob", "officedocument"]) {
    if (code.includes(needle)) failures.push(`${file} (popup) contient « ${needle} »`);
  }
}
if (existsSync("dist/assets/content.js")) failures.push("dist/assets/content.js existe encore");
const manifest = JSON.parse(readFileSync("dist/manifest.json", "utf8"));
if (manifest.content_scripts) failures.push("manifest.content_scripts encore présent");
if (manifest.host_permissions) failures.push("manifest.host_permissions encore présent");

if (failures.length) {
  console.error("Contrôle du bundle en échec :\n- " + failures.join("\n- "));
  process.exit(1);
}
console.log("Contrôle du bundle OK");
