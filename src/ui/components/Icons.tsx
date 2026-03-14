import type { JSX } from "react";

interface IconProps {
  size?: number;
  className?: string;
}

const defaultSize = 16;

/** Flowchart-specific SVG icon library for FlowForge */

export const IconSearch = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="7" r="4.5" />
    <line x1="10.2" y1="10.2" x2="14" y2="14" />
  </svg>
);

export const IconScan = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 5V2.5A1.5 1.5 0 0 1 2.5 1H5" />
    <path d="M11 1h2.5A1.5 1.5 0 0 1 15 2.5V5" />
    <path d="M15 11v2.5a1.5 1.5 0 0 1-1.5 1.5H11" />
    <path d="M5 15H2.5A1.5 1.5 0 0 1 1 13.5V11" />
    <circle cx="8" cy="8" r="2.5" />
  </svg>
);

export const IconLayers = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1L1.5 5L8 9L14.5 5Z" />
    <path d="M1.5 8L8 12L14.5 8" />
    <path d="M1.5 11L8 15L14.5 11" />
  </svg>
);

export const IconGrid = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="1" width="5.5" height="5.5" rx="1" />
    <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" />
    <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" />
    <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" />
  </svg>
);

export const IconExport = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1v9" />
    <path d="M4.5 6.5L8 10l3.5-3.5" />
    <path d="M2 12v1.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V12" />
  </svg>
);

export const IconImport = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 10V1" />
    <path d="M4.5 4.5L8 1l3.5 3.5" />
    <path d="M2 12v1.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V12" />
  </svg>
);

export const IconSun = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="3" />
    <line x1="8" y1="1" x2="8" y2="2.5" />
    <line x1="8" y1="13.5" x2="8" y2="15" />
    <line x1="1" y1="8" x2="2.5" y2="8" />
    <line x1="13.5" y1="8" x2="15" y2="8" />
    <line x1="3.05" y1="3.05" x2="4.1" y2="4.1" />
    <line x1="11.9" y1="11.9" x2="12.95" y2="12.95" />
    <line x1="3.05" y1="12.95" x2="4.1" y2="11.9" />
    <line x1="11.9" y1="4.1" x2="12.95" y2="3.05" />
  </svg>
);

export const IconMoon = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 8.5a5.5 5.5 0 1 1-6-6 4.5 4.5 0 0 0 6 6z" />
  </svg>
);

export const IconPlus = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="8" y1="3" x2="8" y2="13" />
    <line x1="3" y1="8" x2="13" y2="8" />
  </svg>
);

export const IconTrash = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 4h11" />
    <path d="M5.5 4V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4" />
    <path d="M3.5 4l.7 9.1a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9L12.5 4" />
  </svg>
);

export const IconCopy = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="5" width="9" height="9" rx="1.5" />
    <path d="M11 5V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6.5A1.5 1.5 0 0 0 3 11h2" />
  </svg>
);

export const IconTag = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 8.9V2a.5.5 0 0 1 .5-.5h6.9a.5.5 0 0 1 .35.15l5.6 5.6a.5.5 0 0 1 0 .7L9.45 13.3a.5.5 0 0 1-.7 0L1.65 6.2" />
    <circle cx="5" cy="5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconTarget = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <circle cx="8" cy="8" r="3" />
    <circle cx="8" cy="8" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

export const IconWand = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 14.5l9-9" />
    <path d="M7.5 2.5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
    <circle cx="12.5" cy="2" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="14" cy="5.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSelectAll = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="10" height="10" rx="1.5" strokeDasharray="2,2" />
    <path d="M6 8l2 2 3-4" />
  </svg>
);

export const IconClearAll = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M5.5 5.5l5 5" />
    <path d="M10.5 5.5l-5 5" />
  </svg>
);

export const IconChevronDown = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6l4 4 4-4" />
  </svg>
);

export const IconChevronUp = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10l4-4 4 4" />
  </svg>
);

export const IconClose = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="4" y1="4" x2="12" y2="12" />
    <line x1="12" y1="4" x2="4" y2="12" />
  </svg>
);

export const IconPlay = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="currentColor" stroke="none">
    <path d="M4 2.5v11l9-5.5z" />
  </svg>
);

export const IconEye = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);

export const IconSettings = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 1.5h3l.5 2 1.5.8 1.8-.8 2.1 2.1-.8 1.8.8 1.5 2 .5v3l-2 .5-.8 1.5.8 1.8-2.1 2.1-1.8-.8-1.5.8-.5 2h-3l-.5-2-1.5-.8-1.8.8L.6 12.2l.8-1.8L.6 8.9l-2-.5v-3l2-.5.8-1.5-.8-1.8L3.7.5l1.8.8L7 .5z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);

export const IconDragHandle = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="currentColor" stroke="none">
    <circle cx="5.5" cy="4" r="1.2" />
    <circle cx="10.5" cy="4" r="1.2" />
    <circle cx="5.5" cy="8" r="1.2" />
    <circle cx="10.5" cy="8" r="1.2" />
    <circle cx="5.5" cy="12" r="1.2" />
    <circle cx="10.5" cy="12" r="1.2" />
  </svg>
);

export const IconLegend = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="2" width="4" height="4" rx="1" fill="currentColor" opacity=".2" />
    <line x1="7" y1="4" x2="15" y2="4" />
    <rect x="1" y="10" width="4" height="4" rx="1" fill="currentColor" opacity=".2" />
    <line x1="7" y1="12" x2="15" y2="12" />
  </svg>
);

export const IconOrganize = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5.5" y="1" width="5" height="3.5" rx="1" fill="currentColor" opacity=".15" />
    <rect x="1" y="11.5" width="5" height="3.5" rx="1" fill="currentColor" opacity=".15" />
    <rect x="10" y="11.5" width="5" height="3.5" rx="1" fill="currentColor" opacity=".15" />
    <path d="M8 4.5V7.5" />
    <path d="M8 7.5L3.5 11.5" />
    <path d="M8 7.5L12.5 11.5" />
  </svg>
);

export const IconPalette = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1a7 7 0 0 0-1 13.9c.8.1 1.1-.4 1.1-.8V12.5c0-1 .8-1.5 .8-1.5a4.9 4.9 0 0 0 5-4 4.6 4.6 0 0 0-1.8-4.3A7 7 0 0 0 8 1z" />
    <circle cx="5" cy="6.5" r="1" fill="var(--err, #dc2626)" stroke="none" />
    <circle cx="8" cy="4.5" r="1" fill="var(--warn, #d97706)" stroke="none" />
    <circle cx="11" cy="6.5" r="1" fill="var(--ok, #059669)" stroke="none" />
  </svg>
);

export const IconBolt = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="currentColor" stroke="none">
    <path d="M9 1L3 9h4.5l-1 6L13 7H8.5z" />
  </svg>
);

export const IconFilter = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 2.5h13" />
    <path d="M3.5 6h9" />
    <path d="M5.5 9.5h5" />
    <path d="M7 13h2" />
  </svg>
);

export const IconCheck = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8l3.5 3.5L13 4" />
  </svg>
);

export const IconInfo = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <line x1="8" y1="7" x2="8" y2="11" />
    <circle cx="8" cy="5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

export const IconWarning = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 1L1 14h14z" />
    <line x1="8" y1="6" x2="8" y2="10" />
    <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

export const IconError = ({ size = defaultSize, className }: IconProps): JSX.Element => (
  <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6" />
    <path d="M10 6L6 10" />
    <path d="M6 6l4 4" />
  </svg>
);

/* ── Brand Mark ── */
export const FlowForgeMark = ({ size = 22 }: { size?: number }): JSX.Element => (
  <svg className="brand-mark" viewBox="0 0 24 24" width={size} height={size} fill="none">
    {/* Anvil base */}
    <rect x="2" y="16" width="20" height="4" rx="2" fill="var(--acc)" opacity=".2" />
    {/* Flow nodes */}
    <rect x="2" y="4" width="6" height="5" rx="1.5" fill="var(--acc)" opacity=".7" />
    <rect x="9" y="4" width="6" height="5" rx="1.5" fill="var(--acc)" opacity=".5" />
    <rect x="16" y="4" width="6" height="5" rx="1.5" fill="var(--acc)" opacity=".35" />
    {/* Connecting lines down to forge */}
    <path d="M5 9v3.5c0 1 1 2 3 2h8c2 0 3-1 3-2V9" stroke="var(--acc)" strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
    {/* Spark */}
    <circle cx="12" cy="14" r="1" fill="var(--acc)" opacity=".8" />
    <line x1="12" y1="12" x2="12" y2="13" stroke="var(--acc)" strokeWidth="0.8" strokeLinecap="round" opacity=".6" />
    <line x1="10.5" y1="13" x2="11.2" y2="13.5" stroke="var(--acc)" strokeWidth="0.8" strokeLinecap="round" opacity=".4" />
    <line x1="13.5" y1="13" x2="12.8" y2="13.5" stroke="var(--acc)" strokeWidth="0.8" strokeLinecap="round" opacity=".4" />
  </svg>
);
