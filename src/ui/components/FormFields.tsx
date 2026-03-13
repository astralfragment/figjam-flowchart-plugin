import type { JSX } from "react";

export const HEX_6 = /^#?[0-9A-F]{6}$/i;
export const HEX_8 = /^#?[0-9A-F]{8}$/i;

export const normalizeHexColor = (value: string, fallback: string): string => {
  const fallbackColor = fallback.trim().toUpperCase();
  const raw = value.trim().toUpperCase();
  const candidate = raw.startsWith("#") ? raw : `#${raw}`;
  if (HEX_6.test(candidate)) return candidate;
  if (HEX_8.test(candidate)) return candidate.slice(0, 7);
  return fallbackColor;
};

export const isHexColor = (value: string): boolean => HEX_6.test(value);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

interface NumericInputProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

export const NumericInput = ({
  label,
  value,
  min,
  max,
  step,
  onChange
}: NumericInputProps): JSX.Element => (
  <label className="field">
    <span>{label}</span>
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </label>
);

interface ColorFieldProps {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}

export const ColorField = ({ label, value, fallback, onChange }: ColorFieldProps): JSX.Element => (
  <label className="field">
    <span>{label}</span>
    <div className="color-row">
      <input
        type="color"
        value={isHexColor(value) ? normalizeHexColor(value, fallback) : normalizeHexColor(fallback, "#000000")}
        onChange={(event) => onChange(normalizeHexColor(event.target.value, fallback))}
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        onBlur={(event) => onChange(normalizeHexColor(event.target.value, fallback))}
      />
    </div>
  </label>
);

export const clampWindowSize = (value: number, min: number, max: number): number =>
  clamp(Math.round(value), min, max);
