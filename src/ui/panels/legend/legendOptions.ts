import type { ConnectorPathType, FigJamShapeType, LayoutRole } from "@shared/types";

export const SHAPE_TYPE_OPTIONS: { value: FigJamShapeType; label: string }[] = [
  { value: "ROUNDED_RECTANGLE", label: "Rounded Rect" },
  { value: "ELLIPSE", label: "Ellipse" },
  { value: "DIAMOND", label: "Diamond" },
  { value: "SQUARE", label: "Square" },
  { value: "PARALLELOGRAM_RIGHT", label: "Parallelogram" },
  { value: "TRAPEZOID", label: "Trapezoid" },
  { value: "MANUAL_INPUT", label: "Manual Input" },
  { value: "ENG_DATABASE", label: "Database" },
  { value: "ENG_QUEUE", label: "Queue" },
  { value: "ENG_FILE", label: "File" },
  { value: "DOCUMENT_SINGLE", label: "Document" },
  { value: "HEXAGON", label: "Hexagon" },
  { value: "PREDEFINED_PROCESS", label: "Predefined Process" }
];

export const LAYOUT_ROLES: LayoutRole[] = [
  "entry", "exit", "process", "decision", "merge", "fork",
  "loop", "io", "manual", "subprocess", "annotation", "delay", "default"
];

export const PATH_TYPES: { value: ConnectorPathType; label: string }[] = [
  { value: "ELBOWED", label: "Elbowed" },
  { value: "CURVED", label: "Curved" },
  { value: "STRAIGHT", label: "Straight" }
];
