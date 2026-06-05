const MATH_INPUT_REPLACEMENTS: Record<string, string> = {
  "≥": ">=",
  "≤": "<=",
  "≠": "!=",
};

const MATH_INPUT_SYMBOL_PATTERN = /[≥≤≠]/g;
const PI_SYMBOL_PATTERN = /[πΠ]/g;

function canMultiplyBeforePi(character: string | undefined) {
  return character !== undefined && /[A-Za-z0-9_πΠ.)\]]/.test(character);
}

function canMultiplyAfterPi(character: string | undefined) {
  return character !== undefined && /[A-Za-z0-9_πΠ(]/.test(character);
}

function normalizePiSymbols(raw: string): string {
  return raw.replace(PI_SYMBOL_PATTERN, (symbol, index: number) => {
    const previous = raw[index - 1];
    const next = raw[index + symbol.length];
    const prefix = canMultiplyBeforePi(previous) ? " * " : "";
    const suffix = canMultiplyAfterPi(next) ? " * " : "";

    return `${prefix}pi${suffix}`;
  });
}

export function normalizeMathInput(raw: string): string {
  return normalizePiSymbols(raw).replace(
    MATH_INPUT_SYMBOL_PATTERN,
    (symbol) => MATH_INPUT_REPLACEMENTS[symbol] ?? symbol,
  );
}
