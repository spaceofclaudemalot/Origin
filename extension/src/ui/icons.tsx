import React from "react";

type IconProps = { className?: string };

/** Icônes en ligne (trait 1,5 px, couleur du texte) : rien à charger, compatible CSP. */
const icon = (paths: React.ReactNode) => {
  const Icon: React.FC<IconProps> = ({ className = "w-5 h-5" }) => (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
  return Icon;
};

export const ILogo = icon(<><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" /></>);
export const IDocs = icon(<><path d="M4 6.5h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M4 6.5v-1a2 2 0 0 1 2-2h4l2 2" /></>);
export const IAnalysis = icon(<><path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7L4.5 11 10.1 9z" /></>);
export const IPlus = icon(<path d="M12 5v14M5 12h14" />);
export const IMore = icon(<><circle cx="5.5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18.5" cy="12" r="1" /></>);
export const IUndo = icon(<><path d="M9 7 4.5 11.5 9 16" /><path d="M5 11.5h9a5 5 0 0 1 0 10h-2" /></>);
export const IRedo = icon(<><path d="m15 7 4.5 4.5L15 16" /><path d="M19 11.5h-9a5 5 0 0 0 0 10h2" /></>);
export const IBold = icon(<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zm0 7h7a3.5 3.5 0 0 1 0 7H7z" />);
export const IItalic = icon(<path d="M10 5h8M6 19h8M14 5l-4 14" />);
export const IUnderline = icon(<><path d="M7 4v7a5 5 0 0 0 10 0V4" /><path d="M5 20h14" /></>);
export const ITextColor = icon(<><path d="m6 16 6-12 6 12M8.2 11.5h7.6" /><path d="M4 20h16" strokeWidth={3} /></>);
export const IHighlight = icon(<><path d="m14.5 4.5 5 5L11 18H6v-5z" /><path d="M4 21h16" /></>);
export const IBullet = icon(<><circle cx="5" cy="7" r=".8" /><circle cx="5" cy="12" r=".8" /><circle cx="5" cy="17" r=".8" /><path d="M9 7h11M9 12h11M9 17h11" /></>);
export const IOrdered = icon(<><path d="M4 5h1.5v4M4 9h3M4 14.5c0-1 .7-1.5 1.5-1.5s1.5.5 1.5 1.3c0 1.2-3 2.2-3 3.7h3" /><path d="M10 7h10M10 12h10M10 17h10" /></>);
export const IQuote = icon(<><path d="M5 18c2.5-1 3.5-3 3.5-6V7H4.5v5h4" /><path d="M14.5 18c2.5-1 3.5-3 3.5-6V7h-4v5h4" /></>);
export const ILink = icon(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>);
export const IImage = icon(<><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m20.5 16-5-5L6 19" /></>);
export const ITable = icon(<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 10h17M3.5 15h17M10 4.5v15" /></>);
export const ISearch = icon(<><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></>);
export const IChevron = icon(<path d="m6 9 6 6 6-6" />);
export const IClose = icon(<path d="M6 6l12 12M18 6 6 18" />);
export const IPin = icon(<><path d="M9 4h6l-1 5 3 3H7l3-3z" /><path d="M12 12v8" /></>);
export const IEye = icon(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>);
export const IEyeOff = icon(<><path d="M4 4l16 16" /><path d="M9.9 5.8A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.7M6.5 7.3A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1" /><path d="M10 10a3 3 0 0 0 4 4" /></>);
export const IEdit = icon(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>);
export const ITrash = icon(<><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5" /></>);
