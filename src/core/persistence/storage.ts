import { NAMESPACE_KEY, STATE_KEY, defaultState, defaultStateV2 } from "@shared/defaults";
import type { PluginStateV1, PluginStateV2, PresetBundleV1 } from "@shared/types";
import { migrateV1toV2, sanitizeBundle, sanitizeState, sanitizeStateV2, toPresetBundle } from "./schema";

const storageKey = `${NAMESPACE_KEY}.${STATE_KEY}`;
const storageKeyV2 = `${NAMESPACE_KEY}.state.v2`;

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

export const loadPluginStateV2 = (): PluginStateV2 => {
  const rawV2 = figma.root.getPluginData(storageKeyV2);
  if (rawV2) {
    try {
      return sanitizeStateV2(JSON.parse(rawV2));
    } catch (_error) {
      // fall through to V1 migration
    }
  }

  // Try migrating from V1
  const rawV1 = figma.root.getPluginData(storageKey);
  if (rawV1) {
    try {
      const v1 = sanitizeState(JSON.parse(rawV1));
      return migrateV1toV2(v1);
    } catch (_error) {
      // fall through to defaults
    }
  }

  return defaultStateV2();
};

export const savePluginStateV2 = (state: PluginStateV2): void => {
  figma.root.setPluginData(storageKeyV2, JSON.stringify(state));
};

export const exportStateBundle = (state: PluginStateV1): PresetBundleV1 => {
  return toPresetBundle(state, NAMESPACE_KEY);
};

export const importStateBundle = (bundle: unknown): PresetBundleV1 | null => {
  return sanitizeBundle(bundle);
};
