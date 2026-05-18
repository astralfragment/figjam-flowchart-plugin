import { NAMESPACE_KEY, STATE_KEY, defaultLegacyState, defaultState } from "@shared/defaults";
import type { LegacyPluginState, LegacyPresetBundle, PluginState } from "@shared/types";
import {
  migrateLegacyState,
  sanitizeBundle,
  sanitizeLegacyState,
  sanitizeState,
  toPresetBundle
} from "./schema";

const legacyStorageKey = `${NAMESPACE_KEY}.${STATE_KEY}`;
const currentStorageKey = `${NAMESPACE_KEY}.state.v2`;

export const loadLegacyPluginState = (): LegacyPluginState => {
  const raw = figma.root.getPluginData(legacyStorageKey);
  if (!raw) {
    return defaultLegacyState();
  }

  try {
    return sanitizeLegacyState(JSON.parse(raw));
  } catch (_error) {
    return defaultLegacyState();
  }
};

export const saveLegacyPluginState = (state: LegacyPluginState): void => {
  figma.root.setPluginData(legacyStorageKey, JSON.stringify(state));
};

export const loadPluginState = (): PluginState => {
  const rawCurrent = figma.root.getPluginData(currentStorageKey);
  if (rawCurrent) {
    try {
      return sanitizeState(JSON.parse(rawCurrent));
    } catch (_error) {
      // fall through to legacy migration
    }
  }

  const rawLegacy = figma.root.getPluginData(legacyStorageKey);
  if (rawLegacy) {
    try {
      return migrateLegacyState(sanitizeLegacyState(JSON.parse(rawLegacy)));
    } catch (_error) {
      // fall through to defaults
    }
  }

  return defaultState();
};

export const savePluginState = (state: PluginState): void => {
  figma.root.setPluginData(currentStorageKey, JSON.stringify(state));
};

export const exportStateBundle = (state: LegacyPluginState): LegacyPresetBundle => {
  return toPresetBundle(state, NAMESPACE_KEY);
};

export const importStateBundle = (bundle: unknown): LegacyPresetBundle | null => {
  return sanitizeBundle(bundle);
};
