const HEX_6 = /^#[0-9a-fA-F]{6}$/;
const HEX_8 = /^#[0-9a-fA-F]{8}$/;

export const normalizeHexColor = (
  input: string,
  fallback = "#000000",
  options?: { allowAlpha?: boolean }
): string => {
  const allowAlpha = options?.allowAlpha ?? true;
  const candidate = input.trim().toUpperCase();
  const fallbackColor = fallback.trim().toUpperCase();

  if (HEX_6.test(candidate)) {
    return candidate;
  }

  if (HEX_8.test(candidate)) {
    return allowAlpha ? candidate : candidate.slice(0, 7);
  }

  if (HEX_6.test(fallbackColor)) {
    return fallbackColor;
  }

  if (HEX_8.test(fallbackColor)) {
    return allowAlpha ? fallbackColor : fallbackColor.slice(0, 7);
  }

  return "#000000";
};

const normalizeHex = (input: string): string =>
  normalizeHexColor(input, "#000000", { allowAlpha: true });

const channel = (hex: string, start: number): number => parseInt(hex.slice(start, start + 2), 16) / 255;
const toHexChannel = (value: number): string => {
  const bounded = Math.max(0, Math.min(1, value));
  return Math.round(bounded * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
};

export const hexToSolidPaint = (hexInput: string): SolidPaint => {
  const hex = normalizeHex(hexInput);
  return {
    type: "SOLID",
    color: {
      r: channel(hex, 1),
      g: channel(hex, 3),
      b: channel(hex, 5)
    },
    opacity: hex.length === 9 ? channel(hex, 7) : 1
  };
};

export const solidPaintToHex = (paint: Paint, includeAlpha = false): string | null => {
  if (paint.type !== "SOLID") {
    return null;
  }

  const alpha = paint.opacity ?? 1;
  const rgb = `${toHexChannel(paint.color.r)}${toHexChannel(paint.color.g)}${toHexChannel(paint.color.b)}`;

  if (includeAlpha && alpha < 1) {
    return `#${rgb}${toHexChannel(alpha)}`;
  }

  return `#${rgb}`;
};

export const firstSolidPaintToHex = (
  paints: unknown,
  fallback: string,
  includeAlpha = false
): string => {
  if (!Array.isArray(paints)) {
    return normalizeHexColor(fallback, "#000000", { allowAlpha: includeAlpha });
  }

  const firstSolid = paints.find((paint): paint is SolidPaint => {
    if (!paint || typeof paint !== "object") {
      return false;
    }

    const candidate = paint as Partial<SolidPaint & { visible?: boolean }>;
    return candidate.type === "SOLID" && candidate.visible !== false;
  });

  if (!firstSolid) {
    return normalizeHexColor(fallback, "#000000", { allowAlpha: includeAlpha });
  }

  return (
    solidPaintToHex(firstSolid, includeAlpha) ??
    normalizeHexColor(fallback, "#000000", { allowAlpha: includeAlpha })
  );
};

export const lineStyleToDashPattern = (lineStyle: "solid" | "dashed" | "dotted"): number[] => {
  if (lineStyle === "dashed") {
    return [10, 8];
  }

  if (lineStyle === "dotted") {
    return [2, 6];
  }

  return [];
};

export const arrowCapToConnectorCap = (
  cap: "none" | "line" | "triangle"
): ConnectorStrokeCap => {
  if (cap === "triangle") {
    return "TRIANGLE_FILLED";
  }

  if (cap === "line") {
    return "ARROW_LINES";
  }

  return "NONE";
};
