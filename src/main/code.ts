import { applyConnectorPreset } from "@core/connectors/applyConnectorStyle";
import { deleteConnectorPreset, upsertConnectorPreset } from "@core/connectors/presets";
import { applyLegendMapping, assignCategoryToNodes, deleteCategory, upsertCategory } from "@core/legend/mapping";
import { runOrganize } from "@core/organize/runOrganize";
import { sanitizeState } from "@core/persistence/schema";
import { exportStateBundle, importStateBundle, loadPluginState, savePluginState } from "@core/persistence/storage";
import { applyShapePreset } from "@core/styles/applyShapeStyle";
import { createPresetFromSelectedShape, extractSelectedShapeStylePreview } from "@core/styles/extractShapeStyle";
import { deleteShapePreset, upsertShapePreset } from "@core/styles/presets";
import type { MainToUI, UIToMain } from "@shared/contracts";
import type { ActionResult, SelectionSummary } from "@shared/types";

declare const __UI_HTML__: string;

const UI_SIZE = {
  width: 560,
  height: 820
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

figma.showUI(__UI_HTML__, {
  ...UI_SIZE,
  title: "LegendFlow Manager"
});

let state = loadPluginState();

const postMessage = (message: MainToUI): void => {
  figma.ui.postMessage(message);
};

const getSelectionSummary = (): SelectionSummary => {
  const selected = figma.currentPage.selection;
  const shapes = selected.filter((node) => node.type === "SHAPE_WITH_TEXT").length;
  const connectors = selected.filter((node) => node.type === "CONNECTOR").length;

  return {
    total: selected.length,
    shapes,
    connectors,
    shapeStylePreview: extractSelectedShapeStylePreview() ?? undefined
  };
};

const sendInitState = (): void => {
  postMessage({
    type: "INIT_STATE",
    state
  });
};

const sendSelectionState = (): void => {
  postMessage({
    type: "SELECTION_STATE",
    selection: getSelectionSummary()
  });
};

const sendValidationError = (action: string, message: string): void => {
  postMessage({
    type: "VALIDATION_ERROR",
    error: {
      action,
      message
    }
  });
};

const sendActionResult = (result: ActionResult): void => {
  postMessage({
    type: "ACTION_RESULT",
    result
  });

  if (result.severity === "error") {
    figma.notify(result.message, { error: true });
    return;
  }

  if (result.severity === "warning") {
    figma.notify(result.message, { timeout: 2500 });
    return;
  }

  figma.notify(result.message, { timeout: 1500 });
};

figma.on("selectionchange", () => {
  sendSelectionState();
});

figma.ui.onmessage = async (message: UIToMain): Promise<void> => {
  switch (message.type) {
    case "INIT_REQUEST": {
      sendInitState();
      sendSelectionState();
      return;
    }

    case "GET_SELECTION": {
      sendSelectionState();
      return;
    }

    case "RESIZE_UI": {
      const width = clamp(Math.round(message.width), 380, 960);
      const height = clamp(Math.round(message.height), 560, 1200);
      figma.ui.resize(width, height);
      return;
    }

    case "SET_THEME_MODE": {
      state = {
        ...state,
        themeMode: message.themeMode
      };
      savePluginState(state);
      sendInitState();
      sendActionResult({
        action: "SET_THEME_MODE",
        severity: "info",
        message: `Theme switched to ${message.themeMode}.`,
        changed: 1,
        skipped: 0
      });
      return;
    }

    case "STYLE_PRESET_UPSERT": {
      state = upsertShapePreset(state, message.preset);
      savePluginState(state);
      sendInitState();
      sendActionResult({
        action: "STYLE_PRESET_UPSERT",
        severity: "info",
        message: `Saved style preset \"${message.preset.name}\".`,
        changed: 1,
        skipped: 0
      });
      return;
    }

    case "STYLE_PRESET_DELETE": {
      const isReferenced = state.categories.some((category) => category.shapePresetId === message.presetId);
      if (isReferenced) {
        sendValidationError(
          "STYLE_PRESET_DELETE",
          "This style preset is currently used by a legend category. Reassign category mappings first."
        );
        return;
      }

      state = deleteShapePreset(state, message.presetId);
      savePluginState(state);
      sendInitState();
      sendActionResult({
        action: "STYLE_PRESET_DELETE",
        severity: "info",
        message: "Style preset deleted.",
        changed: 1,
        skipped: 0
      });
      return;
    }

    case "CREATE_STYLE_FROM_SELECTED": {
      const preset = createPresetFromSelectedShape();
      if (!preset) {
        sendValidationError(
          "CREATE_STYLE_FROM_SELECTED",
          "Select a shape first, then use Create Style From Selected."
        );
        return;
      }

      state = upsertShapePreset(state, preset);
      savePluginState(state);
      sendInitState();
      sendSelectionState();
      sendActionResult({
        action: "CREATE_STYLE_FROM_SELECTED",
        severity: "info",
        message: `Created style preset \"${preset.name}\" from selection.`,
        changed: 1,
        skipped: 0
      });
      return;
    }

    case "APPLY_STYLE_PRESET": {
      const preset = state.shapePresets.find((item) => item.id === message.presetId);
      if (!preset) {
        sendValidationError("APPLY_STYLE_PRESET", "Selected style preset no longer exists.");
        return;
      }

      const result = await applyShapePreset(preset, message.scope);
      sendActionResult(result);
      sendSelectionState();
      return;
    }

    case "CATEGORY_UPSERT": {
      const shapePresetExists = state.shapePresets.some(
        (preset) => preset.id === message.category.shapePresetId
      );

      if (!shapePresetExists) {
        sendValidationError("CATEGORY_UPSERT", "Category requires a valid shape style preset.");
        return;
      }

      if (message.category.connectorPresetId) {
        const connectorPresetExists = state.connectorPresets.some(
          (preset) => preset.id === message.category.connectorPresetId
        );

        if (!connectorPresetExists) {
          sendValidationError("CATEGORY_UPSERT", "Linked connector preset does not exist.");
          return;
        }
      }

      state = upsertCategory(state, message.category);
      savePluginState(state);
      sendInitState();
      sendActionResult({
        action: "CATEGORY_UPSERT",
        severity: "info",
        message: `Saved category \"${message.category.label}\".`,
        changed: 1,
        skipped: 0
      });
      return;
    }

    case "CATEGORY_DELETE": {
      state = deleteCategory(state, message.categoryId);
      savePluginState(state);
      sendInitState();
      sendActionResult({
        action: "CATEGORY_DELETE",
        severity: "info",
        message: "Category removed.",
        changed: 1,
        skipped: 0
      });
      return;
    }

    case "ASSIGN_CATEGORY": {
      const categoryExists = state.categories.some((category) => category.id === message.categoryId);
      if (!categoryExists) {
        sendValidationError("ASSIGN_CATEGORY", "Selected category no longer exists.");
        return;
      }

      const nodeIds =
        message.nodeIds.length > 0
          ? message.nodeIds
          : figma.currentPage.selection
              .filter((node): node is ShapeWithTextNode => node.type === "SHAPE_WITH_TEXT")
              .map((node) => node.id);

      if (nodeIds.length === 0) {
        sendValidationError("ASSIGN_CATEGORY", "Select one or more shapes before assigning a category.");
        return;
      }

      state = assignCategoryToNodes(state, message.categoryId, nodeIds);
      savePluginState(state);
      sendInitState();
      sendActionResult({
        action: "ASSIGN_CATEGORY",
        severity: "info",
        message: `Assigned category to ${nodeIds.length} shape(s).`,
        changed: nodeIds.length,
        skipped: 0
      });
      return;
    }

    case "APPLY_LEGEND_MAPPING": {
      const result = await applyLegendMapping(state, message.scope);
      sendActionResult(result);
      sendSelectionState();
      return;
    }

    case "CONNECTOR_PRESET_UPSERT": {
      state = upsertConnectorPreset(state, message.preset);
      savePluginState(state);
      sendInitState();
      sendActionResult({
        action: "CONNECTOR_PRESET_UPSERT",
        severity: "info",
        message: `Saved connector preset \"${message.preset.name}\".`,
        changed: 1,
        skipped: 0
      });
      return;
    }

    case "CONNECTOR_PRESET_DELETE": {
      const isReferenced = state.categories.some(
        (category) => category.connectorPresetId === message.presetId
      );

      if (isReferenced) {
        sendValidationError(
          "CONNECTOR_PRESET_DELETE",
          "This connector preset is in use by a legend category. Reassign category mappings first."
        );
        return;
      }

      state = deleteConnectorPreset(state, message.presetId);
      savePluginState(state);
      sendInitState();
      sendActionResult({
        action: "CONNECTOR_PRESET_DELETE",
        severity: "info",
        message: "Connector preset deleted.",
        changed: 1,
        skipped: 0
      });
      return;
    }

    case "APPLY_CONNECTOR_PRESET": {
      const preset = state.connectorPresets.find((item) => item.id === message.presetId);
      if (!preset) {
        sendValidationError("APPLY_CONNECTOR_PRESET", "Selected connector preset no longer exists.");
        return;
      }

      const result = applyConnectorPreset(preset, message.scope);
      sendActionResult(result);
      sendSelectionState();
      return;
    }

    case "RUN_ORGANIZE": {
      const result = runOrganize(state, message.config, message.scope);
      sendActionResult(result);
      sendSelectionState();
      return;
    }

    case "EXPORT_PRESETS": {
      const bundle = exportStateBundle(state);
      sendActionResult({
        action: "EXPORT_PRESETS",
        severity: "info",
        message: "Export is ready.",
        changed: bundle.shapePresets.length + bundle.connectorPresets.length + bundle.categories.length,
        skipped: 0,
        exportJson: JSON.stringify(bundle, null, 2)
      });
      return;
    }

    case "IMPORT_PRESETS": {
      const bundle = importStateBundle(message.payload);
      if (!bundle) {
        sendValidationError(
          "IMPORT_PRESETS",
          "Unsupported preset bundle. This plugin only accepts schemaVersion 1 bundles."
        );
        return;
      }

      state = sanitizeState({
        schemaVersion: 1,
        themeMode: state.themeMode,
        shapePresets: bundle.shapePresets,
        connectorPresets: bundle.connectorPresets,
        categories: bundle.categories,
        nodeCategoryAssignments: state.nodeCategoryAssignments
      });

      savePluginState(state);
      sendInitState();
      sendActionResult({
        action: "IMPORT_PRESETS",
        severity: "info",
        message: "Preset bundle imported.",
        changed: bundle.shapePresets.length + bundle.connectorPresets.length + bundle.categories.length,
        skipped: 0
      });
      return;
    }

    default:
      return;
  }
};

sendInitState();
sendSelectionState();
