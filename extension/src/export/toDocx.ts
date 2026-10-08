import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, HeadingLevel, LevelFormat,
  LineRuleType, Packer, Paragraph, ShadingType, TextRun,
  convertMillimetersToTwip, type IRunOptions, type ParagraphChild, type Table,
} from "docx";
import type { JSONContent } from "@tiptap/core";

export interface DocxOptions {
  title: string;
  getImage: (id: string) => Promise<Blob | undefined>;
}

type Block = Paragraph | Table;

interface ListContext {
  reference: "bullets" | "numbers";
  level: number;
  instance: number;
}

interface BlockContext {
  quote?: boolean;
  bold?: boolean;
  list?: ListContext;
}

interface ExportContext {
  opts: DocxOptions;
  nextListInstance: number;
}

const PAGE_MARGIN = convertMillimetersToTwip(25); // 1417
// Dimensions A4 exactes de Word (convertMillimetersToTwip arrondit à 11905 × 16837)
const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const DEFAULT_HIGHLIGHT = "FEF08A";
const INDENT_STEP = 720; // 0,5 pouce en twips

const ALIGNMENTS: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];

export function toHex(color: string | null | undefined): string | undefined {
  if (!color) return undefined;
  const c = color.trim();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c);
  if (short) return (short[1] + short[1] + short[2] + short[2] + short[3] + short[3]).toUpperCase();
  const long = /^#([0-9a-f]{6})$/i.exec(c);
  if (long) return long[1].toUpperCase();
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(c);
  if (rgb) {
    return rgb.slice(1, 4).map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  return undefined;
}

export function toHalfPoints(fontSize: string | null | undefined): number | undefined {
  if (!fontSize) return undefined;
  const m = /^\s*(\d+(?:\.\d+)?)\s*(pt|px)?\s*$/i.exec(fontSize);
  if (!m) return undefined;
  const value = Number(m[1]);
  const pt = m[2]?.toLowerCase() === "px" ? value * 0.75 : value;
  return Math.round(pt * 2);
}

function firstFontFamily(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.split(",")[0].trim().replace(/^["']|["']$/g, "");
}

function runOptions(marks: JSONContent["marks"], bctx: BlockContext): IRunOptions {
  const opts: Record<string, unknown> = {};
  if (bctx.bold) opts.bold = true;
  for (const mark of marks ?? []) {
    const a = mark.attrs ?? {};
    switch (mark.type) {
      case "bold": opts.bold = true; break;
      case "italic": opts.italics = true; break;
      case "underline": opts.underline = {}; break;
      case "textStyle": {
        const font = firstFontFamily(a.fontFamily);
        if (font) opts.font = font;
        const size = toHalfPoints(a.fontSize);
        if (size) opts.size = size;
        const color = toHex(a.color);
        if (color) opts.color = color;
        break;
      }
      case "highlight":
        opts.shading = { type: ShadingType.CLEAR, color: "auto", fill: toHex(a.color) ?? DEFAULT_HIGHLIGHT };
        break;
      case "link":
        opts.color = "0563C1";
        opts.underline = {};
        break;
    }
  }
  return opts as IRunOptions;
}

function inlineChildren(nodes: JSONContent[] | undefined, bctx: BlockContext): ParagraphChild[] {
  const children: ParagraphChild[] = [];
  for (const node of nodes ?? []) {
    if (node.type === "hardBreak") {
      children.push(new TextRun({ text: "", break: 1 }));
      continue;
    }
    if (node.type !== "text" || !node.text) continue;
    const run = new TextRun({ text: node.text, ...runOptions(node.marks, bctx) });
    const link = node.marks?.find((m) => m.type === "link");
    const href = typeof link?.attrs?.href === "string" ? link.attrs.href : undefined;
    children.push(href ? new ExternalHyperlink({ link: href, children: [run] }) : run);
  }
  return children;
}

function paragraph(node: JSONContent, bctx: BlockContext, numbered: boolean): Paragraph {
  const a = node.attrs ?? {};
  const level = Number(a.level);
  const lineHeight = Number(a.lineHeight);
  const listIndent = bctx.list ? INDENT_STEP * (bctx.list.level + 1) : 0;
  const quoteIndent = bctx.quote ? INDENT_STEP : 0;
  return new Paragraph({
    children: inlineChildren(node.content, bctx),
    ...(node.type === "heading" && HEADINGS[level - 1] ? { heading: HEADINGS[level - 1] } : {}),
    ...(typeof a.textAlign === "string" && ALIGNMENTS[a.textAlign] ? { alignment: ALIGNMENTS[a.textAlign] } : {}),
    ...(lineHeight > 0 ? { spacing: { line: Math.round(240 * lineHeight), lineRule: LineRuleType.AUTO } } : {}),
    ...(bctx.list && numbered
      ? { numbering: { reference: bctx.list.reference, level: bctx.list.level, instance: bctx.list.instance } }
      : listIndent + quoteIndent > 0
        ? { indent: { left: listIndent + quoteIndent } }
        : {}),
    ...(bctx.quote
      ? { border: { left: { style: BorderStyle.SINGLE, size: 12, color: "CCCCCC", space: 8 } } }
      : {}),
  });
}

async function blocks(nodes: JSONContent[] | undefined, ctx: ExportContext, bctx: BlockContext): Promise<Block[]> {
  const out: Block[] = [];
  for (const node of nodes ?? []) {
    switch (node.type) {
      case "paragraph":
      case "heading":
        out.push(paragraph(node, bctx, false));
        break;
      case "blockquote":
        out.push(...(await blocks(node.content, ctx, { ...bctx, quote: true })));
        break;
      default:
        out.push(...(await blocks(node.content, ctx, bctx)));
    }
  }
  return out;
}

function numberingConfig(reference: "bullets" | "numbers") {
  const bullet = reference === "bullets";
  return {
    reference,
    levels: Array.from({ length: 9 }, (_, level) => ({
      level,
      format: bullet ? LevelFormat.BULLET : LevelFormat.DECIMAL,
      text: bullet ? ["•", "◦", "▪"][level % 3] : `%${level + 1}.`,
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: INDENT_STEP * (level + 1), hanging: 360 } } },
    })),
  };
}

export async function buildDocument(content: JSONContent, opts: DocxOptions): Promise<Document> {
  const ctx: ExportContext = { opts, nextListInstance: 1 };
  const children = await blocks(content.content, ctx, {});
  return new Document({
    title: opts.title,
    numbering: { config: [numberingConfig("bullets"), numberingConfig("numbers")] },
    sections: [
      {
        properties: {
          page: {
            size: { width: A4_WIDTH, height: A4_HEIGHT },
            margin: { top: PAGE_MARGIN, right: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN },
          },
        },
        children: children.length ? children : [new Paragraph({})],
      },
    ],
  });
}

export async function toDocx(content: JSONContent, opts: DocxOptions): Promise<Blob> {
  return Packer.toBlob(await buildDocument(content, opts));
}
