import type { JSONContent } from "@tiptap/core";

/**
 * Seul accès à IndexedDB. Partagé par le popup et l'éditeur, qui ont la
 * même origine (chrome-extension://<id>) et donc la même base.
 */
export interface StoredDocument {
  id: string;
  title: string;
  content: JSONContent;
  createdAt: number;
  updatedAt: number;
}

interface StoredImageRecord {
  id: string;
  type: string;
  // ArrayBuffer plutôt que Blob : clonable partout (y compris fake-indexeddb)
  data: ArrayBuffer;
}

export const DEFAULT_TITLE = "Sans titre";

const DB_NAME = "textorigin";
const DB_VERSION = 1;
const DOCS = "documents";
const IMAGES = "images";

let dbPromise: Promise<IDBDatabase> | null = null;
let now: () => number = () => Date.now();

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DOCS)) db.createObjectStore(DOCS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(IMAGES)) db.createObjectStore(IMAGES, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    // Un échec d'ouverture ne doit pas bloquer les essais suivants
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export function textToContent(text: string): JSONContent {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return { type: "doc", content: [{ type: "paragraph" }] };
  return {
    type: "doc",
    content: paragraphs.map((p) => ({
      type: "paragraph",
      content: p.split("\n").flatMap((line, i): JSONContent[] =>
        i === 0 ? [{ type: "text", text: line }] : [{ type: "hardBreak" }, { type: "text", text: line }],
      ),
    })),
  };
}

export function collectImageIds(content: JSONContent): string[] {
  const ids: string[] = [];
  const walk = (node: JSONContent) => {
    if (node.type === "storedImage" && typeof node.attrs?.imageId === "string") ids.push(node.attrs.imageId);
    node.content?.forEach(walk);
  };
  walk(content);
  return ids;
}

export async function create(init: { title?: string; text?: string } = {}): Promise<StoredDocument> {
  const t = now();
  const doc: StoredDocument = {
    id: crypto.randomUUID(),
    title: init.title?.trim() || DEFAULT_TITLE,
    content: textToContent(init.text ?? ""),
    createdAt: t,
    updatedAt: t,
  };
  await promisify((await store(DOCS, "readwrite")).put(doc));
  return doc;
}

export async function get(id: string): Promise<StoredDocument | undefined> {
  return promisify((await store(DOCS, "readonly")).get(id) as IDBRequest<StoredDocument | undefined>);
}

export async function list(): Promise<StoredDocument[]> {
  const all = await promisify((await store(DOCS, "readonly")).getAll() as IDBRequest<StoredDocument[]>);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function update(
  id: string,
  patch: Partial<Pick<StoredDocument, "title" | "content">>,
): Promise<StoredDocument> {
  const existing = await get(id);
  if (!existing) throw new Error("Document introuvable");
  const next: StoredDocument = {
    ...existing,
    ...(patch.title !== undefined ? { title: patch.title.trim() || DEFAULT_TITLE } : {}),
    ...(patch.content !== undefined ? { content: patch.content } : {}),
    updatedAt: now(),
  };
  await promisify((await store(DOCS, "readwrite")).put(next));
  return next;
}

export async function remove(id: string): Promise<void> {
  const doc = await get(id);
  if (!doc) return;
  await promisify((await store(DOCS, "readwrite")).delete(id));
  // Une image collée dans un autre document reste référencée : on ne
  // supprime que celles qu'aucun document restant n'utilise.
  const stillUsed = new Set((await list()).flatMap((d) => collectImageIds(d.content)));
  const images = await store(IMAGES, "readwrite");
  await Promise.all(
    collectImageIds(doc.content)
      .filter((imageId) => !stillUsed.has(imageId))
      .map((imageId) => promisify(images.delete(imageId))),
  );
}

export async function putImage(blob: Blob): Promise<string> {
  const record: StoredImageRecord = { id: crypto.randomUUID(), type: blob.type, data: await blob.arrayBuffer() };
  await promisify((await store(IMAGES, "readwrite")).put(record));
  return record.id;
}

export async function getImage(id: string): Promise<Blob | undefined> {
  const record = await promisify(
    (await store(IMAGES, "readonly")).get(id) as IDBRequest<StoredImageRecord | undefined>,
  );
  return record ? new Blob([record.data], { type: record.type }) : undefined;
}

export async function __resetDbForTests(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
  await promisify(indexedDB.deleteDatabase(DB_NAME) as unknown as IDBRequest<unknown>);
}

export function __setClockForTests(fn: () => number): void {
  now = fn;
}
