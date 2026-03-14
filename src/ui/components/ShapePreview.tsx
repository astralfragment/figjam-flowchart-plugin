import type { JSX } from "react";
import type { FigJamShapeType } from "@shared/types";

interface ShapePreviewProps {
  shapeType: FigJamShapeType;
  fill: string;
  stroke: string;
  size?: number;
}

const shapePaths: Record<string, (w: number, h: number) => string> = {
  ROUNDED_RECTANGLE: (w, h) => {
    const r = Math.min(w, h) * 0.2;
    return `M${r},0 H${w - r} Q${w},0 ${w},${r} V${h - r} Q${w},${h} ${w - r},${h} H${r} Q0,${h} 0,${h - r} V${r} Q0,0 ${r},0 Z`;
  },
  SQUARE: (w, h) => `M0,0 H${w} V${h} H0 Z`,
  ELLIPSE: (w, h) => {
    const rx = w / 2, ry = h / 2;
    return `M${rx},0 A${rx},${ry} 0 1,1 ${rx},${h} A${rx},${ry} 0 1,1 ${rx},0 Z`;
  },
  DIAMOND: (w, h) => `M${w / 2},0 L${w},${h / 2} L${w / 2},${h} L0,${h / 2} Z`,
  PARALLELOGRAM_RIGHT: (w, h) => {
    const off = w * 0.2;
    return `M${off},0 H${w} L${w - off},${h} H0 Z`;
  },
  TRAPEZOID: (w, h) => {
    const off = w * 0.15;
    return `M${off},0 H${w - off} L${w},${h} H0 Z`;
  },
  MANUAL_INPUT: (w, h) => {
    const off = h * 0.25;
    return `M0,${off} H${w} V${h} H0 Z`;
  },
  ENG_DATABASE: (w, h) => {
    const ry = h * 0.18;
    return `M0,${ry} Q0,0 ${w / 2},0 Q${w},0 ${w},${ry} V${h - ry} Q${w},${h} ${w / 2},${h} Q0,${h} 0,${h - ry} Z`;
  },
  ENG_QUEUE: (w, h) => {
    const rx = w * 0.18;
    return `M${rx},0 Q0,0 0,${h / 2} Q0,${h} ${rx},${h} H${w - rx} Q${w},${h} ${w},${h / 2} Q${w},0 ${w - rx},0 Z`;
  },
  ENG_FILE: (w, h) => {
    const fold = Math.min(w, h) * 0.25;
    return `M0,0 H${w - fold} L${w},${fold} V${h} H0 Z`;
  },
  DOCUMENT_SINGLE: (w, h) => {
    const wave = h * 0.12;
    return `M0,0 H${w} V${h - wave} Q${w * 0.75},${h} ${w / 2},${h - wave} Q${w * 0.25},${h - wave * 2} 0,${h - wave} Z`;
  },
  HEXAGON: (w, h) => {
    const off = w * 0.22;
    return `M${off},0 H${w - off} L${w},${h / 2} L${w - off},${h} H${off} L0,${h / 2} Z`;
  },
  PREDEFINED_PROCESS: (w, h) => {
    const bar = w * 0.12;
    return `M0,0 H${w} V${h} H0 Z M${bar},0 V${h} M${w - bar},0 V${h}`;
  }
};

export const ShapePreview = ({ shapeType, fill, stroke, size = 28 }: ShapePreviewProps): JSX.Element => {
  const w = size;
  const h = size * 0.75;
  const pad = 2;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const pathFn = shapePaths[shapeType] ?? shapePaths.ROUNDED_RECTANGLE;
  const d = pathFn(innerW, innerH);

  return (
    <svg
      className="shape-preview-svg"
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      style={{ flexShrink: 0 }}
    >
      <g transform={`translate(${pad}, ${pad})`}>
        <path d={d} fill={fill} stroke={stroke} strokeWidth="1.5" fillRule="evenodd" />
      </g>
    </svg>
  );
};
