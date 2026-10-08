import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  create, get, list, update, remove, put, putImage, getImage, textToContent, collectImageIds, DocumentNotFoundError,
  __resetDbForTests, __setClockForTests, DEFAULT_TITLE,
} from "./documents";

let clock = 1000;

beforeEach(async () => {
  await __resetDbForTests();
  clock = 1000;
  __setClockForTests(() => clock++);
});

describe("textToContent", () => {
  it("splits blank-line separated text into paragraphs and single newlines into hard breaks", () => {
    expect(textToContent("Un\r\nDeux\n\n  Trois  ")).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Un" }, { type: "hardBreak" }, { type: "text", text: "Deux" }] },
        { type: "paragraph", content: [{ type: "text", text: "Trois" }] },
      ],
    });
  });

  it("returns a single empty paragraph for blank text", () => {
    expect(textToContent("  \n ")).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });
});

describe("collectImageIds", () => {
  it("finds storedImage ids at any depth", () => {
    const content = {
      type: "doc",
      content: [
        { type: "storedImage", attrs: { imageId: "a" } },
        { type: "blockquote", content: [{ type: "storedImage", attrs: { imageId: "b" } }] },
      ],
    };
    expect(collectImageIds(content).sort()).toEqual(["a", "b"]);
  });
});

describe("documents store", () => {
  it("creates a document with default title and text content", async () => {
    const doc = await create({ text: "Bonjour" });
    expect(doc.title).toBe(DEFAULT_TITLE);
    expect(doc.content).toEqual(textToContent("Bonjour"));
    expect(await get(doc.id)).toEqual(doc);
  });

  it("returns undefined for an unknown id", async () => {
    expect(await get("nope")).toBeUndefined();
  });

  it("lists documents by most recent update first", async () => {
    const a = await create({ title: "A" });
    const b = await create({ title: "B" });
    await update(a.id, { title: "A2" });
    expect((await list()).map((d) => d.title)).toEqual(["A2", "B"]);
    expect(b.updatedAt).toBeLessThan((await get(a.id))!.updatedAt);
  });

  it("rejects update of a missing document", async () => {
    await expect(update("nope", { title: "x" })).rejects.toThrow("Document introuvable");
    await expect(update("nope", { title: "x" })).rejects.toBeInstanceOf(DocumentNotFoundError);
  });

  it("put writes a whole document in one request", async () => {
    const doc = await create({ title: "A" });
    await put({ ...doc, title: "B", updatedAt: 5000 });
    expect(await get(doc.id)).toMatchObject({ title: "B", updatedAt: 5000 });
  });

  it("stores and returns image bytes with their type", async () => {
    const id = await putImage(new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }));
    const blob = await getImage(id);
    expect(blob?.type).toBe("image/png");
    expect(new Uint8Array(await blob!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("remove deletes the document and only its orphan images", async () => {
    const shared = await putImage(new Blob([new Uint8Array([1])], { type: "image/png" }));
    const own = await putImage(new Blob([new Uint8Array([2])], { type: "image/png" }));
    const img = (imageId: string) => ({ type: "storedImage", attrs: { imageId, width: 1, height: 1, alt: "" } });
    const a = await create();
    await update(a.id, { content: { type: "doc", content: [img(shared), img(own)] } });
    const b = await create();
    await update(b.id, { content: { type: "doc", content: [img(shared)] } });

    await remove(a.id);

    expect(await get(a.id)).toBeUndefined();
    expect(await getImage(own)).toBeUndefined();
    expect(await getImage(shared)).toBeDefined();
  });
});
