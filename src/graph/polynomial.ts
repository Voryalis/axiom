import { all, create } from "mathjs";

const math = create(all, {});

export type QuadraticCoefficients = { a: number; b: number; c: number };

type Polynomial = QuadraticCoefficients;

const addPoly = (first: Polynomial, second: Polynomial): Polynomial => ({
  a: first.a + second.a,
  b: first.b + second.b,
  c: first.c + second.c,
});

const multiplyPoly = (first: Polynomial, second: Polynomial) => {
  const x4 = first.a * second.a;
  const x3 = first.a * second.b + first.b * second.a;
  if (Math.abs(x4) > 1e-12 || Math.abs(x3) > 1e-12) return null;
  return {
    a: first.a * second.c + first.b * second.b + first.c * second.a,
    b: first.b * second.c + first.c * second.b,
    c: first.c * second.c,
  };
};

const dividePoly = (dividend: Polynomial, divisor: Polynomial) => {
  if (Math.abs(divisor.a) > 1e-12 || Math.abs(divisor.b) > 1e-12) return null;
  if (Math.abs(divisor.c) < 1e-12) return null;
  return {
    a: dividend.a / divisor.c,
    b: dividend.b / divisor.c,
    c: dividend.c / divisor.c,
  };
};

const visit = (
  currentNode: unknown,
  scope: Record<string, number>,
): Polynomial | null => {
  const typed = currentNode as {
    type?: string;
    value?: string;
    name?: string;
    op?: string;
    fn?: { name?: string };
    args?: unknown[];
    content?: unknown;
  };
  if (!typed || !typed.type) return null;

  if (typed.type === "ParenthesisNode") {
    return visit(typed.content, scope);
  }

  if (typed.type === "ConstantNode") {
    const value = Number(typed.value);
    if (!Number.isFinite(value)) return null;
    return { a: 0, b: 0, c: value };
  }

  if (typed.type === "SymbolNode") {
    if (typed.name === "x") return { a: 0, b: 1, c: 0 };
    const value = typed.name ? scope[typed.name] : undefined;
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return { a: 0, b: 0, c: value };
  }

  if (typed.type === "OperatorNode") {
    if (typed.fn?.name === "unaryMinus" && typed.args?.[0]) {
      const value = visit(typed.args[0], scope);
      if (!value) return null;
      return { a: -value.a, b: -value.b, c: -value.c };
    }

    const left = typed.args?.[0] ? visit(typed.args[0], scope) : null;
    const right = typed.args?.[1] ? visit(typed.args[1], scope) : null;
    if (!left || !right) return null;

    if (typed.op === "+") return addPoly(left, right);
    if (typed.op === "-")
      return addPoly(left, { a: -right.a, b: -right.b, c: -right.c });
    if (typed.op === "*") return multiplyPoly(left, right);
    if (typed.op === "/") return dividePoly(left, right);
    if (typed.op === "^") {
      if (Math.abs(right.a) > 1e-12 || Math.abs(right.b) > 1e-12) return null;
      const exponent = Math.round(right.c);
      if (Math.abs(right.c - exponent) > 1e-12 || exponent < 0 || exponent > 2)
        return null;
      if (exponent === 0) return { a: 0, b: 0, c: 1 };
      if (exponent === 1) return left;
      return multiplyPoly(left, left);
    }
  }

  return null;
};

export function extractQuadraticCoefficients(
  expression: string,
  scope: Record<string, number>,
): QuadraticCoefficients | undefined {
  const node = math.parse(expression);

  try {
    const result = visit(node, scope);
    return result ?? undefined;
  } catch {
    return undefined;
  }
}
