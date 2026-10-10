import React, { useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { FONT_FAMILIES, FONT_SIZES } from "./schema";
import { LINE_HEIGHTS } from "./extensions/ParagraphLineHeight";
import { insertImageFiles } from "./StoredImageView";
import { useToast } from "./Toast";
import { Button, IconButton } from "../ui/primitives";
import {
  IBold, IBullet, IHighlight, IImage, IItalic, ILink, IOrdered, IQuote, IRedo, ITable, ITextColor, IUnderline, IUndo,
} from "../ui/icons";

const TEXT_COLORS = ["#202124", "#d93025", "#e37400", "#188038", "#1a73e8", "#9334e6", "#80868b"];
const HIGHLIGHTS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa"];

const Btn: React.FC<{
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode;
}> = ({ label, active, disabled, onClick, children }) => (
  <IconButton label={label} active={active} disabled={disabled} keepFocus onClick={onClick}>
    {children}
  </IconButton>
);

const SELECT = "h-8 text-[13px] bg-transparent rounded-ctl hover:bg-surface px-1.5 outline-none cursor-pointer";
const POPOVER = "absolute top-9 left-0 z-30 bg-raised border border-line rounded-card shadow-lift p-2 flex gap-1";
const ICON = "w-[18px] h-[18px]";

const Sep = () => <span className="w-px h-5 bg-line mx-1" aria-hidden="true" />;

const Swatches: React.FC<{ label: string; colors: string[]; onPick: (c: string | null) => void; children: React.ReactNode }> = ({
  label, colors, onPick, children,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Btn label={label} onClick={() => setOpen((o) => !o)}>{children}</Btn>
      {open && (
        <div className={POPOVER} onMouseLeave={() => setOpen(false)}>
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(c); setOpen(false); }}
              className="w-5 h-5 rounded-md border border-line"
              style={{ background: c }}
            />
          ))}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(null); setOpen(false); }} className="text-2xs px-1 text-muted hover:text-ink">
            Aucune
          </button>
        </div>
      )}
    </div>
  );
};

export const Toolbar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
            table: e.isActive("table"),
            heading: ([1, 2, 3] as const).find((level) => e.isActive("heading", { level })) ?? 0,
            align: (["center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
            font: (e.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
            size: ((e.getAttributes("textStyle").fontSize as string | undefined) ?? "").replace("pt", ""),
            lineHeight: (e.getAttributes("paragraph").lineHeight as string | undefined) ?? "",
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  if (!editor || !s) return null;
  const chain = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1 bg-raised border border-line rounded-card shadow-soft" role="toolbar" aria-label="Mise en forme">
      <Btn label="Annuler (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}><IUndo className={ICON} /></Btn>
      <Btn label="Rétablir (Ctrl+Y)" disabled={!s.canRedo} onClick={() => chain().redo().run()}><IRedo className={ICON} /></Btn>
      <Sep />
      <select
        aria-label="Style de paragraphe"
        value={s.heading}
        onChange={(e) => {
          const level = Number(e.target.value) as 0 | 1 | 2 | 3;
          if (level === 0) chain().setParagraph().run();
          else chain().setHeading({ level }).run();
        }}
        className={SELECT}
      >
        <option value={0}>Texte normal</option>
        <option value={1}>Titre 1</option>
        <option value={2}>Titre 2</option>
        <option value={3}>Titre 3</option>
      </select>
      <select
        aria-label="Police"
        value={s.font}
        onChange={(e) => (e.target.value ? chain().setFontFamily(e.target.value).run() : chain().unsetFontFamily().run())}
        className={`${SELECT} w-36`}
      >
        <option value="">Police par défaut</option>
        {FONT_FAMILIES.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
      </select>
      <select
        aria-label="Taille"
        value={s.size}
        onChange={(e) => (e.target.value ? chain().setFontSize(`${e.target.value}pt`).run() : chain().unsetFontSize().run())}
        className={`${SELECT} w-16`}
      >
        <option value="">11</option>
        {FONT_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <Sep />
      <Btn label="Gras (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}><IBold className={ICON} /></Btn>
      <Btn label="Italique (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}><IItalic className={ICON} /></Btn>
      <Btn label="Souligné (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}><IUnderline className={ICON} /></Btn>
      <Swatches label="Couleur du texte" colors={TEXT_COLORS} onPick={(c) => (c ? chain().setColor(c).run() : chain().unsetColor().run())}><ITextColor className={ICON} /></Swatches>
      <Swatches label="Surlignage" colors={HIGHLIGHTS} onPick={(c) => (c ? chain().setHighlight({ color: c }).run() : chain().unsetHighlight().run())}><IHighlight className={ICON} /></Swatches>
      <Sep />
      <select
        aria-label="Alignement"
        value={s.align}
        onChange={(e) => chain().setTextAlign(e.target.value).run()}
        className={SELECT}
      >
        <option value="left">Gauche</option>
        <option value="center">Centré</option>
        <option value="right">Droite</option>
        <option value="justify">Justifié</option>
      </select>
      <select
        aria-label="Interligne"
        value={s.lineHeight}
        onChange={(e) => (e.target.value ? chain().setParagraphLineHeight(e.target.value).run() : chain().unsetParagraphLineHeight().run())}
        className={SELECT}
      >
        <option value="">Interligne</option>
        {LINE_HEIGHTS.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <Sep />
      <Btn label="Liste à puces" active={s.bullet} onClick={() => chain().toggleBulletList().run()}><IBullet className={ICON} /></Btn>
      <Btn label="Liste numérotée" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}><IOrdered className={ICON} /></Btn>
      <Btn label="Citation" active={s.quote} onClick={() => chain().toggleBlockquote().run()}><IQuote className={ICON} /></Btn>
      <Sep />
      <LinkButton editor={editor} active={s.link} />
      <Btn label="Insérer une image" onClick={() => fileInput.current?.click()}><IImage className={ICON} /></Btn>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void insertImageFiles(editor.view, files, (m) => toast.show(m, "error"));
        }}
      />
      <Btn label="Insérer un tableau" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><ITable className={ICON} /></Btn>
      {s.table && (
        <>
          <Btn label="Ajouter une ligne" onClick={() => chain().addRowAfter().run()}>+L</Btn>
          <Btn label="Supprimer la ligne" onClick={() => chain().deleteRow().run()}>−L</Btn>
          <Btn label="Ajouter une colonne" onClick={() => chain().addColumnAfter().run()}>+C</Btn>
          <Btn label="Supprimer la colonne" onClick={() => chain().deleteColumn().run()}>−C</Btn>
          <Btn label="Supprimer le tableau" onClick={() => chain().deleteTable().run()}>✕⊞</Btn>
        </>
      )}
    </div>
  );
};

/** Saisie d'URL en ligne (pas de prompt() natif). */
const LinkButton: React.FC<{ editor: Editor; active: boolean }> = ({ editor, active }) => {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  if (active) {
    return <Btn label="Retirer le lien" active onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}><ILink className={ICON} /></Btn>;
  }
  return (
    <div className="relative">
      <Btn label="Insérer un lien" onClick={() => setOpen((o) => !o)}><ILink className={ICON} /></Btn>
      {open && (
        <form
          className={POPOVER}
          onSubmit={(e) => {
            e.preventDefault();
            const url = href.trim();
            if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: /^[a-z]+:/i.test(url) ? url : `https://${url}` }).run();
            setHref("");
            setOpen(false);
          }}
        >
          <input
            autoFocus
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://…"
            aria-label="Adresse du lien"
            className="h-8 bg-surface border border-line rounded-ctl px-2 text-[13px] w-64 outline-none focus:border-accent"
          />
          <Button size="sm" type="submit">OK</Button>
        </form>
      )}
    </div>
  );
};
