export type MathPaletteItem = {
  label: string;
  snippet: string;
  ariaLabel: string;
};

export const MATH_PALETTE_ITEMS: MathPaletteItem[] = [
  { label: "π", snippet: "π", ariaLabel: "Insert pi" },
  { label: "θ", snippet: "theta", ariaLabel: "Insert theta" },
  { label: "√", snippet: "sqrt()", ariaLabel: "Insert square root" },
  { label: "^", snippet: "^", ariaLabel: "Insert exponent" },
  { label: "≤", snippet: "≤", ariaLabel: "Insert less than or equal to" },
  { label: "≥", snippet: "≥", ariaLabel: "Insert greater than or equal to" },
  { label: "≠", snippet: "≠", ariaLabel: "Insert not equal to" },
  { label: "sin", snippet: "sin()", ariaLabel: "Insert sine function" },
  { label: "cos", snippet: "cos()", ariaLabel: "Insert cosine function" },
  { label: "tan", snippet: "tan()", ariaLabel: "Insert tangent function" },
  {
    label: "abs",
    snippet: "abs()",
    ariaLabel: "Insert absolute value function",
  },
  { label: "()", snippet: "()", ariaLabel: "Insert parentheses" },
];

export function getMathPaletteCursorOffset(snippet: string) {
  return snippet.endsWith("()") ? snippet.length - 1 : snippet.length;
}

export function insertMathPaletteSnippet(
  value: string,
  snippet: string,
  selectionStart: number,
  selectionEnd: number,
) {
  const safeSelectionStart = Math.max(
    0,
    Math.min(selectionStart, value.length),
  );
  const safeSelectionEnd = Math.max(
    safeSelectionStart,
    Math.min(selectionEnd, value.length),
  );
  const nextValue = `${value.slice(0, safeSelectionStart)}${snippet}${value.slice(
    safeSelectionEnd,
  )}`;
  const cursorPosition =
    safeSelectionStart + getMathPaletteCursorOffset(snippet);

  return {
    value: nextValue,
    selection: { start: cursorPosition, end: cursorPosition },
  };
}