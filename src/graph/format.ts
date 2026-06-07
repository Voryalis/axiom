export type CoordinateLabelFormat = "decimal" | "symbolic-pi";

export type CoordinateLabelFormatter = (value: number) => string;

export function normalizeDisplayNumber(value: number, epsilon = 1e-9) {
  if (!Number.isFinite(value)) return value;
  return Math.abs(value) < epsilon ? 0 : value;
}

export function formatRoundedNumber(
  value: number,
  decimals: number,
  epsilon = 1e-9,
) {
  const normalized = normalizeDisplayNumber(value, epsilon);

  if (!Number.isFinite(normalized)) return "undefined";

  const rounded = Number(normalized.toFixed(decimals));
  const cleaned = normalizeDisplayNumber(rounded, epsilon);

  if (Object.is(cleaned, -0)) return "0";

  return cleaned.toString();
}

export function formatAxisDecimalCoordinate(value: number) {
  if (!Number.isFinite(value)) {
    return "undefined";
  }

  value = normalizeDisplayNumber(value, 1e-8);

  if (value === 0) {
    return "0";
  }

  const nearestInteger = Math.round(value);

  if (Math.abs(value - nearestInteger) < 0.001) {
    return nearestInteger.toString();
  }

  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
    return value.toExponential(1);
  }

  return formatRoundedNumber(value, 4, 1e-8);
}

export function formatPointDecimalCoordinate(value: number) {
  return formatRoundedNumber(value, 6);
}

export function formatSymbolicPiCoordinate(
  value: number,
  fallbackFormatter: CoordinateLabelFormatter,
  tolerance = 1e-6,
) {
  if (!Number.isFinite(value)) {
    return fallbackFormatter(value);
  }

  const normalized = normalizeDisplayNumber(value, tolerance);

  if (normalized === 0) {
    return "0";
  }

  const piMultiples = [
    { denominator: 1, maxNumerator: 12 },
    { denominator: 2, maxNumerator: 12 },
  ];

  for (const { denominator, maxNumerator } of piMultiples) {
    const scaled = (normalized / Math.PI) * denominator;
    const numerator = Math.round(scaled);

    if (numerator === 0 || Math.abs(numerator) > maxNumerator) continue;

    const candidate = (numerator * Math.PI) / denominator;

    if (Math.abs(normalized - candidate) <= tolerance) {
      return formatPiMultiple(numerator, denominator);
    }
  }

  return fallbackFormatter(value);
}

export function formatCoordinateLabel(
  value: number,
  format: CoordinateLabelFormat,
  fallbackFormatter: CoordinateLabelFormatter,
) {
  if (format === "symbolic-pi") {
    return formatSymbolicPiCoordinate(value, fallbackFormatter);
  }

  return fallbackFormatter(value);
}

function formatPiMultiple(numerator: number, denominator: number) {
  const sign = numerator < 0 ? "-" : "";
  const absoluteNumerator = Math.abs(numerator);

  if (denominator === 1) {
    return absoluteNumerator === 1
      ? `${sign}π`
      : `${sign}${absoluteNumerator}π`;
  }

  return absoluteNumerator === 1
    ? `${sign}π/${denominator}`
    : `${sign}${absoluteNumerator}π/${denominator}`;
}
