import React, { useEffect, useId, useRef, useState } from "react";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const BUTTON_VARIANT = {
  primary: "bg-accent text-accent-ink hover:brightness-110 disabled:bg-line disabled:text-muted",
  secondary: "bg-raised border border-line text-ink hover:bg-surface disabled:opacity-50",
  ghost: "text-ink hover:bg-raised disabled:opacity-50",
} as const;

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANT; size?: "sm" | "md" }
> = ({ variant = "primary", size = "md", className, type = "button", ...rest }) => (
  <button
    type={type}
    className={cx(
      "inline-flex items-center justify-center gap-1.5 rounded-ctl font-semibold transition-colors disabled:cursor-not-allowed",
      size === "md" ? "h-9 px-4 text-[13px]" : "h-7 px-2.5 text-2xs",
      BUTTON_VARIANT[variant],
      className,
    )}
    {...rest}
  />
);

/** Bouton à icône ; `keepFocus` garde la sélection de l'éditeur au clic. */
export const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean; keepFocus?: boolean }
> = ({ label, active, keepFocus, className, type = "button", onMouseDown, ...rest }) => (
  <button
    type={type}
    title={label}
    aria-label={label}
    aria-pressed={active}
    onMouseDown={(e) => {
      if (keepFocus) e.preventDefault();
      onMouseDown?.(e);
    }}
    className={cx(
      "h-8 min-w-8 px-1.5 rounded-ctl inline-flex items-center justify-center text-[13px] transition-colors disabled:opacity-40",
      active ? "bg-ink/10 text-ink" : "text-ink hover:bg-surface",
      className,
    )}
    {...rest}
  />
);

const CHIP_TONE = {
  accent: "bg-accent text-accent-ink",
  neutral: "bg-line text-ink",
  outline: "border border-line text-ink hover:bg-surface",
} as const;

type ChipProps = { tone?: keyof typeof CHIP_TONE; className?: string; children: React.ReactNode };

export const Chip: React.FC<
  (ChipProps & { as?: "span" } & React.HTMLAttributes<HTMLSpanElement>) |
  (ChipProps & { as: "button" } & React.ButtonHTMLAttributes<HTMLButtonElement>)
> = ({ tone = "neutral", as = "span", className, ...rest }) => {
  const classes = cx(
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-semibold whitespace-nowrap",
    CHIP_TONE[tone],
    as === "button" && "transition-[filter] hover:brightness-105",
    className,
  );
  return as === "button"
    ? <button type="button" className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)} />
    : <span className={classes} {...(rest as React.HTMLAttributes<HTMLSpanElement>)} />;
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={cx("bg-raised rounded-card shadow-soft border border-line/60", className)} {...rest} />
);

const sectionKey = (id: string) => `textorigin:section:${id}`;

function readOpen(id: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(sectionKey(id));
    return v == null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

/** Section repliable ; état mémorisé quand elle n'est pas contrôlée. */
export const Collapsible: React.FC<{
  id: string;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}> = ({ id, title, count, defaultOpen = true, open, onOpenChange, children }) => {
  const [own, setOwn] = useState(() => readOpen(id, defaultOpen));
  const isOpen = open ?? own;
  const bodyId = useId();
  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setOwn(next);
    try {
      localStorage.setItem(sectionKey(id), next ? "1" : "0");
    } catch {
      // état non mémorisé, sans gravité
    }
    onOpenChange?.(next);
  };
  return (
    <section aria-label={title}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        className="w-full flex items-center gap-2 py-1.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted hover:text-ink"
      >
        <span className="flex-1">{title}</span>
        {count != null && (
          <span className="min-w-5 h-5 px-1.5 rounded-full bg-line text-ink text-[11px] inline-flex items-center justify-center normal-case tracking-normal">
            {count}
          </span>
        )}
        <svg viewBox="0 0 24 24" className={cx("w-4 h-4 transition-transform", isOpen && "rotate-180")} fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && <div id={bodyId} className="pt-1.5">{children}</div>}
    </section>
  );
};

/** Menu déroulant : Échap / clic extérieur ferment, flèches entre les éléments. */
export const Menu: React.FC<{
  label: React.ReactNode;
  ariaLabel?: string;
  buttonClassName?: string;
  align?: "left" | "right";
  disabled?: boolean;
  children: (close: () => void) => React.ReactNode;
}> = ({ label, ariaLabel, buttonClassName, align = "right", disabled, children }) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    root.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(root.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length];
    next?.focus();
  };

  return (
    <div ref={root} className="relative" onKeyDown={open ? onKeyDown : undefined}>
      <button
        ref={button}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={buttonClassName}
      >
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className={cx(
            "absolute top-full mt-1.5 z-40 min-w-44 bg-raised border border-line rounded-card shadow-lift p-1",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
};

export const MenuItem: React.FC<{ onSelect: () => void; children: React.ReactNode; tone?: "default" | "accent" }> = ({
  onSelect, children, tone = "default",
}) => (
  <button
    type="button"
    role="menuitem"
    onClick={onSelect}
    className={cx(
      "w-full text-left px-3 py-2 rounded-ctl text-[13px] hover:bg-surface focus:bg-surface outline-none",
      tone === "accent" ? "text-accent font-medium" : "text-ink",
    )}
  >
    {children}
  </button>
);
