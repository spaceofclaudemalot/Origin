import { describe, it, expect, beforeEach } from "vitest";
import { writeBackup, clearBackup, withBackup, pruneBackups } from "./backup";
import type { StoredDocument } from "./documents";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  get length() { return this.data.size; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
}

const doc = (updatedAt: number, title = "T", id = "A"): StoredDocument => ({
  id, title, content: { type: "doc", content: [] }, createdAt: 1, updatedAt,
});

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

describe("backup", () => {
  it("recovers a backup newer than the stored document", () => {
    writeBackup(doc(200, "Non enregistré"));
    expect(withBackup(doc(100))).toEqual({ doc: doc(200, "Non enregistré"), recovered: true });
  });

  it("ignores and clears a backup that is not newer", () => {
    writeBackup(doc(100, "Ancien"));
    expect(withBackup(doc(100))).toEqual({ doc: doc(100), recovered: false });
    expect(withBackup(doc(50))).toEqual({ doc: doc(50), recovered: false });
  });

  it("clearBackup removes the backup", () => {
    writeBackup(doc(200));
    clearBackup("A");
    expect(withBackup(doc(100)).recovered).toBe(false);
  });

  it("ignores a corrupted backup", () => {
    localStorage.setItem("textorigin:unsaved:A", "{oops");
    expect(withBackup(doc(100))).toEqual({ doc: doc(100), recovered: false });
  });

  it("pruneBackups removes backups of deleted documents only", () => {
    writeBackup(doc(200, "Gardé", "A"));
    writeBackup(doc(200, "Supprimé", "B"));
    localStorage.setItem("autre:clef", "x");
    pruneBackups(["A"]);
    expect(localStorage.getItem("textorigin:unsaved:A")).not.toBeNull();
    expect(localStorage.getItem("textorigin:unsaved:B")).toBeNull();
    expect(localStorage.getItem("autre:clef")).toBe("x");
  });
});
