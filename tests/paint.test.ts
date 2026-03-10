import { describe, expect, it } from "vitest";
import {
  arrowCapToConnectorCap,
  lineStyleToDashPattern,
  normalizeHexColor,
  solidPaintToHex
} from "@core/common/paint";

describe("lineStyleToDashPattern", () => {
  it("maps solid to empty pattern", () => {
    expect(lineStyleToDashPattern("solid")).toEqual([]);
  });

  it("maps dashed and dotted patterns", () => {
    expect(lineStyleToDashPattern("dashed")).toEqual([10, 8]);
    expect(lineStyleToDashPattern("dotted")).toEqual([2, 6]);
  });
});

describe("arrowCapToConnectorCap", () => {
  it("maps friendly values to figma caps", () => {
    expect(arrowCapToConnectorCap("none")).toBe("NONE");
    expect(arrowCapToConnectorCap("line")).toBe("ARROW_LINES");
    expect(arrowCapToConnectorCap("triangle")).toBe("TRIANGLE_FILLED");
  });
});

describe("normalizeHexColor", () => {
  it("normalizes alpha colors to opaque when allowAlpha is false", () => {
    expect(normalizeHexColor("#AABBCC99", "#000000", { allowAlpha: false })).toBe("#AABBCC");
  });

  it("keeps uppercase hex and falls back to default for invalid values", () => {
    expect(normalizeHexColor("#aabbcc", "#123456", { allowAlpha: false })).toBe("#AABBCC");
    expect(normalizeHexColor("invalid", "#123456", { allowAlpha: false })).toBe("#123456");
  });
});

describe("solidPaintToHex", () => {
  it("emits opaque hex by default and includes alpha when requested", () => {
    const paint: SolidPaint = {
      type: "SOLID",
      color: { r: 0.1, g: 0.2, b: 0.3 },
      opacity: 0.5
    };

    expect(solidPaintToHex(paint)).toBe("#1A334D");
    expect(solidPaintToHex(paint, true)).toBe("#1A334D80");
  });
});
