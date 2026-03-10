import { NAMESPACE_KEY, STATE_KEY, defaultState } from "@shared/defaults";
import type { PluginStateV1, PresetBundleV1 } from "@shared/types";
import { sanitizeBundle, sanitizeState, toPresetBundle } from "./schema";

const storageKey = `${NAMESPACE_KEY}.${STATE_KEY}`;

export const loadPluginState = (): PluginStateV1 => {
  const raw = figma.root.getPluginData(storageKey);
  if (!raw) {
    return defaultState();
  }

  try {
    return sanitizeState(JSON.parse(raw));
  } catch (_error) {
    return defaultState();
  }
};

export const savePluginState = (state: PluginStateV1): void => {
  figma.root.setPluginData(storageKey, JSON.stringify(state));
};

export const exportStateBundle = (state: PluginStateV1): PresetBundleV1 => {
  return toPresetBundle(state, NAMESPACE_KEY);
};

export const importStateBundle = (bundle: unknown): PresetBundleV1 | null => {
  return sanitizeBundle(bundle);
};

