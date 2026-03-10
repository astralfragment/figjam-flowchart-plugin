import type { ConnectorStylePreset, PluginStateV1 } from "@shared/types";

export const upsertConnectorPreset = (
  state: PluginStateV1,
  preset: ConnectorStylePreset
): PluginStateV1 => {
  const index = state.connectorPresets.findIndex((item) => item.id === preset.id);
  if (index === -1) {
    return {
      ...state,
      connectorPresets: [...state.connectorPresets, preset]
    };
  }

  const next = [...state.connectorPresets];
  next[index] = preset;
  return {
    ...state,
    connectorPresets: next
  };
};

export const deleteConnectorPreset = (
  state: PluginStateV1,
  presetId: string
): PluginStateV1 => ({
  ...state,
  connectorPresets: state.connectorPresets.filter((preset) => preset.id !== presetId)
});
