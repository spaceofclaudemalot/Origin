import { describe, it, expect, beforeEach } from "vitest";
import { writeBackup, clearBackup, withBackup } from "./backup";
import type { StoredDocument } from "./documents";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

const doc = (updatedAt: number, title = "T"): StoredDocument => ({
  id: "A", title, content: { type: "doc", content: [] }, createdAt: 1, updatedAt,
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
});
