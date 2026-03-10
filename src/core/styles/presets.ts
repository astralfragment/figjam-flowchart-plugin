import type { PluginStateV1, ShapeStylePreset } from "@shared/types";

export const upsertShapePreset = (
  state: PluginStateV1,
  preset: ShapeStylePreset
): PluginStateV1 => {
  const index = state.shapePresets.findIndex((item) => item.id === preset.id);
  if (index === -1) {
    return {
      ...state,
      shapePresets: [...state.shapePresets, preset]
    };
  }

  const next = [...state.shapePresets];
  next[index] = preset;
  return {
    ...state,
    shapePresets: next
  };
};

export const deleteShapePreset = (
  state: PluginStateV1,
  presetId: string
): PluginStateV1 => ({
  ...state,
  shapePresets: state.shapePresets.filter((preset) => preset.id !== presetId)
});
