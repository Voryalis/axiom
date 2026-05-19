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
