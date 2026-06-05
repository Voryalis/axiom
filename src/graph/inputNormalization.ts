const MATH_INPUT_REPLACEMENTS: Record<string, string> = {
  "≥": ">=",
  "≤": "<=",
  "≠": "!=",
  π: "pi",
  Π: "pi",
};

const MATH_INPUT_SYMBOL_PATTERN = /[≥≤≠πΠ]/g;

export function normalizeMathInput(raw: string): string {
  return raw.replace(
    MATH_INPUT_SYMBOL_PATTERN,
    (symbol) => MATH_INPUT_REPLACEMENTS[symbol] ?? symbol,
  );
}
