import type { CoordinateLabelFormat } from "../graph/format";

export type AppSettings = {
  showGraphDetails: boolean;
  showGrid: boolean;
  showMinorGrid: boolean;
  showAxes: boolean;
  showAxisLabels: boolean;
  showIntersections: boolean;
  coordinateLabelFormat: CoordinateLabelFormat;
};

export const APP_SETTINGS_KEY = "axiom.appSettings";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  showGraphDetails: true,
  showGrid: true,
  showMinorGrid: true,
  showAxes: true,
  showAxisLabels: true,
  showIntersections: true,
  coordinateLabelFormat: "decimal",
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);

    if (!raw) {
      return DEFAULT_APP_SETTINGS;
    }

    const parsed = JSON.parse(raw);

    return {
      showGraphDetails:
        typeof parsed.showGraphDetails === "boolean"
          ? parsed.showGraphDetails
          : true,
      showGrid: typeof parsed.showGrid === "boolean" ? parsed.showGrid : true,
      showMinorGrid:
        typeof parsed.showMinorGrid === "boolean" ? parsed.showMinorGrid : true,
      showAxes: typeof parsed.showAxes === "boolean" ? parsed.showAxes : true,
      showAxisLabels:
        typeof parsed.showAxisLabels === "boolean"
          ? parsed.showAxisLabels
          : true,
      showIntersections:
        typeof parsed.showIntersections === "boolean"
          ? parsed.showIntersections
          : true,
      coordinateLabelFormat:
        parsed.coordinateLabelFormat === "symbolic-pi"
          ? "symbolic-pi"
          : "decimal",
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings) {
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings, null, 2));
}
