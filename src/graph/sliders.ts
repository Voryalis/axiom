import { all, create } from "mathjs";
import { formatRoundedNumber } from "./format";
import { normalizeMathInput } from "./inputNormalization";

const math = create(all, {});

function parseVariableAssignment(rawExpression: string) {
  const match = normalizeMathInput(rawExpression)
    .trim()
    .match(/^([a-zA-Z]\w*)\s*=\s*(.+)$/);

  if (!match) return null;

  const [, name, expression] = match;

  if (!name || !expression) return null;
  if (name === "x" || name === "y") return null;

  return { name, expression };
}

export function parseSliderConfig(expression: string) {
  const trimmed = normalizeMathInput(expression).trim();
  const match = trimmed.match(
    /^(.*?)\s*\[\s*(-?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(-?(?:\d+(?:\.\d+)?|\.\d+))(?:\s*,\s*(-?(?:\d+(?:\.\d+)?|\.\d+)))?\s*\]\s*$/,
  );

  const defaultConfig = {
    expression: trimmed,
    min: -10,
    max: 10,
    step: 0.1,
    hasCustomConfig: false,
  };

  if (!match) return defaultConfig;

  const [, rawExpression, rawMin, rawMax, rawStep] = match;

  if (!rawExpression?.trim() || !rawMin || !rawMax) {
    return defaultConfig;
  }

  const min = Number(rawMin);
  const max = Number(rawMax);
  const step = rawStep ? Number(rawStep) : 0.1;

  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    !Number.isFinite(step) ||
    min >= max ||
    step <= 0
  ) {
    return defaultConfig;
  }

  return {
    expression: rawExpression.trim(),
    min,
    max,
    step,
    hasCustomConfig: true,
  };
}

function formatSliderConfigNumber(value: number) {
  return formatRoundedNumber(value, 6);
}

export function formatSliderUiCompactNumber(value: number) {
  const abs = Math.abs(value);

  if ((abs >= 1e7 || (abs > 0 && abs < 1e-4)) && Number.isFinite(value)) {
    return value.toExponential(0).replace("e+", "e");
  }

  return formatSliderConfigNumber(value);
}

export function formatVariableAssignmentWithSliderConfig(
  name: string,
  value: number,
  config?: { min: number; max: number; step: number } | null,
) {
  const roundedValue = formatRoundedNumber(value, 6);

  if (!config) {
    return `${name} = ${roundedValue}`;
  }

  return `${name} = ${roundedValue} [${formatSliderConfigNumber(
    config.min,
  )}, ${formatSliderConfigNumber(config.max)}, ${formatSliderConfigNumber(
    config.step,
  )}]`;
}

export function parseNumericVariableAssignment(rawExpression: string) {
  const assignment = parseVariableAssignment(rawExpression);

  if (!assignment) return null;

  const sliderConfig = parseSliderConfig(assignment.expression);

  try {
    const value = math.evaluate(sliderConfig.expression);

    if (typeof value !== "number" || !Number.isFinite(value)) return null;

    return {
      name: assignment.name,
      value,
      min: sliderConfig.min,
      max: sliderConfig.max,
      step: sliderConfig.step,
      hasCustomConfig: sliderConfig.hasCustomConfig,
    };
  } catch {
    return null;
  }
}

export function updateVariableAssignment(raw: string, value: number) {
  const assignment = parseVariableAssignment(raw);

  if (!assignment) return raw;

  const sliderConfig = parseSliderConfig(assignment.expression);

  return formatVariableAssignmentWithSliderConfig(
    assignment.name,
    value,
    sliderConfig.hasCustomConfig
      ? {
          min: sliderConfig.min,
          max: sliderConfig.max,
          step: sliderConfig.step,
        }
      : null,
  );
}

export function updateVariableAssignmentSliderConfig(
  raw: string,
  patch: Partial<{ min: number; max: number; step: number }>,
) {
  const assignment = parseVariableAssignment(raw);

  if (!assignment) return raw;

  const sliderConfig = parseSliderConfig(assignment.expression);
  const nextConfig = {
    min: sliderConfig.min,
    max: sliderConfig.max,
    step: sliderConfig.step,
  };

  if (patch.min !== undefined) nextConfig.min = patch.min;
  if (patch.max !== undefined) nextConfig.max = patch.max;
  if (patch.step !== undefined) nextConfig.step = patch.step;

  if (
    !Number.isFinite(nextConfig.min) ||
    !Number.isFinite(nextConfig.max) ||
    !Number.isFinite(nextConfig.step) ||
    nextConfig.min >= nextConfig.max ||
    nextConfig.step <= 0
  ) {
    return raw;
  }

  try {
    const value = math.evaluate(sliderConfig.expression);

    if (typeof value !== "number" || !Number.isFinite(value)) {
      return raw;
    }

    return formatVariableAssignmentWithSliderConfig(
      assignment.name,
      value,
      nextConfig,
    );
  } catch {
    return raw;
  }
}

export function formatExpressionForDisplay(raw: string) {
  const assignment = parseVariableAssignment(raw);
  if (!assignment) return raw;
  const sliderConfig = parseSliderConfig(assignment.expression);
  if (!sliderConfig.hasCustomConfig) return raw;
  return `${assignment.name} = ${sliderConfig.expression}`;
}

export function preserveSliderConfigFromPreviousRaw(
  previousRaw: string,
  nextRaw: string,
) {
  const previousAssignment = parseVariableAssignment(previousRaw);
  const nextAssignment = parseVariableAssignment(nextRaw);
  if (!previousAssignment || !nextAssignment) return nextRaw;
  if (previousAssignment.name !== nextAssignment.name) return nextRaw;

  const previousSliderConfig = parseSliderConfig(previousAssignment.expression);
  if (!previousSliderConfig.hasCustomConfig) return nextRaw;

  const nextSliderConfig = parseSliderConfig(nextAssignment.expression);
  if (nextSliderConfig.hasCustomConfig) return nextRaw;

  return `${nextAssignment.name} = ${nextSliderConfig.expression} [${formatSliderConfigNumber(
    previousSliderConfig.min,
  )}, ${formatSliderConfigNumber(previousSliderConfig.max)}, ${formatSliderConfigNumber(
    previousSliderConfig.step,
  )}]`;
}
