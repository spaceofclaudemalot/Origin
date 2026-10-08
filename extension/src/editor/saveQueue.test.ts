import { describe, it, expect, vi } from "vitest";
import { createSaveQueue } from "./saveQueue";
import { DocumentNotFoundError, type StoredDocument } from "../storage/documents";

const doc = (id: string, title = id): StoredDocument => ({
  id, title, content: { type: "doc", content: [] }, createdAt: 1, updatedAt: 1,
});

function setup(update: (id: string, patch: object) => Promise<StoredDocument>) {
  const put = vi.fn(async (_doc: StoredDocument) => {});
  const statuses: string[] = [];
  const queue = createSaveQueue({ update, put, onStatus: (s) => statuses.push(s) });
  return { queue, put, statuses };
}

describe("createSaveQueue", () => {
  it("never discards another document's edits when one document can no longer be saved", async () => {
    const saved: Array<[string, object]> = [];
    const { queue, statuses } = setup(async (id, patch) => {
      if (id === "A") throw new DocumentNotFoundError();
      saved.push([id, patch]);
      return doc(id);
    });
    queue.schedule("A", { title: "a" });
    queue.schedule("B", { title: "b" });
    await queue.flush();
    expect(saved).toEqual([["B", { title: "b" }]]);
    expect(queue.hasPending()).toBe(false);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("keeps a transiently failing patch for retry without touching the other document", async () => {
    let failA = true;
    const saved: Array<[string, object]> = [];
    const { queue, statuses } = setup(async (id, patch) => {
      if (id === "A" && failA) throw new Error("quota");
      saved.push([id, patch]);
      return doc(id);
    });
    queue.schedule("A", { title: "a1" });
    queue.schedule("B", { title: "b" });
    await queue.flush();
    expect(statuses.at(-1)).toBe("error");
    expect(saved).toEqual([["B", { title: "b" }]]);

    failA = false;
    queue.schedule("A", { title: "a2" });
    await queue.flush();
    expect(saved).toContainEqual(["A", { title: "a2" }]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("keeps edits made while a save is in flight", async () => {
    let release!: () => void;
    const calls: object[] = [];
    const { queue } = setup(async (id, patch) => {
      calls.push(patch);
      if (calls.length === 1) await new Promise<void>((r) => (release = r));
      return doc(id);
    });
    queue.schedule("A", { title: "1" });
    const first = queue.flush();
    queue.schedule("A", { title: "2" });
    release();
    await first;
    expect(queue.hasPending()).toBe(true);
    await queue.flush();
    expect(calls).toEqual([{ title: "1" }, { title: "2" }]);
  });

  it("flushNow writes tracked documents with a single synchronous put (page unload)", () => {
    const { queue, put } = setup(async (id) => doc(id));
    queue.track(doc("A", "Ancien"));
    const content = { type: "doc", content: [{ type: "paragraph" }] };
    queue.schedule("A", { content });
    queue.flushNow();
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0][0]).toMatchObject({ id: "A", title: "Ancien", content });
  });

  it("flushNow uses the latest saved version as base", async () => {
    const { queue, put } = setup(async (id) => doc(id, "Renommé"));
    queue.track(doc("A", "Ancien"));
    queue.schedule("A", { title: "Renommé" });
    await queue.flush();
    queue.schedule("A", { content: { type: "doc" } });
    queue.flushNow();
    expect(put.mock.calls[0][0]).toMatchObject({ title: "Renommé", content: { type: "doc" } });
  });

  it("flushNow skips documents it has no base for", () => {
    const { queue, put } = setup(async (id) => doc(id));
    queue.schedule("X", { title: "x" });
    queue.flushNow();
    expect(put).not.toHaveBeenCalled();
  });
});
