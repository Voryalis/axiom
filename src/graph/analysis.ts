import type { RenderedCurvePoint } from "./tables";

export type AnalysisPoint = {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
};

export function findVisibleCurveExtrema(points: RenderedCurvePoint[]) {
  if (points.length < 3) return [];

  const extrema: AnalysisPoint[] = [];

  for (let index = 1; index < points.length - 1; index++) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];

    if (!previous || !current || !next) continue;

    const isLocalMinimum = current.y <= previous.y && current.y <= next.y;
    const isLocalMaximum = current.y >= previous.y && current.y >= next.y;

    if (!isLocalMinimum && !isLocalMaximum) continue;

    const strength =
      Math.abs(current.y - previous.y) + Math.abs(current.y - next.y);

    if (strength < 1e-8) continue;

    const extremum = findQuadraticExtremumThroughPoints(
      previous,
      current,
      next,
    );

    const graphX = extremum?.x ?? current.x;
    const graphY = extremum?.y ?? current.y;
    const screenX =
      findScreenCoordinateForGraphX(previous, current, next, graphX, "x") ??
      current.screenX;
    const screenY =
      findScreenCoordinateForGraphX(previous, current, next, graphX, "y") ??
      current.screenY;

    if (hasNearAnalysisPoint(extrema, screenX, screenY, 18)) continue;

    extrema.push({
      x: normalizeAnalysisCoordinate(graphX),
      y: normalizeAnalysisCoordinate(graphY),
      screenX,
      screenY,
    });
  }

  return extrema;
}

export function normalizeAnalysisCoordinate(value: number) {
  if (!Number.isFinite(value)) return value;
  return Math.abs(value) < 1e-10 ? 0 : value;
}

export type ExplicitCurveEvaluator = (x: number) => number | null;

export function evaluateYIntercept(evaluate: ExplicitCurveEvaluator) {
  const y = evaluate(0);
  if (y === null || !Number.isFinite(y)) return null;
  return { x: 0, y: normalizeAnalysisCoordinate(y) };
}

export function findVisibleRoots(
  evaluate: ExplicitCurveEvaluator,
  xMin: number,
  xMax: number,
) {
  const roots: Array<{ x: number; y: number }> = [];
  const steps = 1024;
  const dx = (xMax - xMin) / steps;
  let previousX = xMin;
  let previousY = evaluate(previousX);

  const pushRoot = (x: number) => {
    if (roots.some((root) => Math.abs(root.x - x) < 1e-6)) return;
    roots.push({ x: normalizeAnalysisCoordinate(x), y: 0 });
  };

  for (let index = 1; index <= steps; index++) {
    const x = xMin + dx * index;
    const y = evaluate(x);
    if (previousY !== null && Number.isFinite(previousY) && Math.abs(previousY) < 1e-12) pushRoot(previousX);
    if (previousY !== null && y !== null && Number.isFinite(previousY) && Number.isFinite(y) && previousY * y < 0) {
      let left = previousX;
      let right = x;
      let leftY = previousY;
      for (let i = 0; i < 60; i++) {
        const mid = (left + right) / 2;
        const midY = evaluate(mid);
        if (midY === null || !Number.isFinite(midY)) break;
        if (Math.abs(midY) < 1e-14) {
          left = mid;
          right = mid;
          break;
        }
        if (leftY * midY <= 0) {
          right = mid;
        } else {
          left = mid;
          leftY = midY;
        }
      }
      pushRoot((left + right) / 2);
    }
    previousX = x;
    previousY = y;
  }
  return roots.sort((a, b) => a.x - b.x);
}

export function tryFindQuadraticModel(evaluate: ExplicitCurveEvaluator) {
  const y0 = evaluate(0);
  const y1 = evaluate(1);
  const ym1 = evaluate(-1);
  if ([y0, y1, ym1].some((v) => v === null || !Number.isFinite(v as number))) return null;
  const c = y0 as number;
  const a = ((y1 as number) + (ym1 as number)) / 2 - c;
  const b = (y1 as number) - a - c;
  const checkpoints = [-2, -0.5, 0.5, 2];
  for (const x of checkpoints) {
    const y = evaluate(x);
    if (y === null || !Number.isFinite(y)) return null;
    const expected = a * x * x + b * x + c;
    if (Math.abs(y - expected) > 1e-9 * Math.max(1, Math.abs(y), Math.abs(expected))) return null;
  }
  return { a, b, c };
}

function hasNearAnalysisPoint(
  points: AnalysisPoint[],
  screenX: number,
  screenY: number,
  radius: number,
) {
  return points.some(
    (existing) =>
      Math.hypot(existing.screenX - screenX, existing.screenY - screenY) <
      radius,
  );
}

function findScreenCoordinateForGraphX(
  first: RenderedCurvePoint,
  second: RenderedCurvePoint,
  third: RenderedCurvePoint,
  graphX: number,
  axis: "x" | "y",
) {
  const points = [first, second, third].sort((a, b) => a.x - b.x);

  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index];
    const end = points[index + 1];

    if (!start || !end) continue;

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);

    if (graphX < minX || graphX > maxX) continue;

    const range = end.x - start.x;

    if (Math.abs(range) < 1e-12) return null;

    const t = (graphX - start.x) / range;

    return axis === "x"
      ? start.screenX + (end.screenX - start.screenX) * t
      : start.screenY + (end.screenY - start.screenY) * t;
  }

  return null;
}

function findQuadraticExtremumThroughPoints(
  first: RenderedCurvePoint,
  second: RenderedCurvePoint,
  third: RenderedCurvePoint,
) {
  const x1 = first.x;
  const y1 = first.y;
  const x2 = second.x;
  const y2 = second.y;
  const x3 = third.x;
  const y3 = third.y;

  const denominator = (x1 - x2) * (x1 - x3) * (x2 - x3);

  if (Math.abs(denominator) < 1e-12) return null;

  const a = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / denominator;

  if (Math.abs(a) < 1e-12) return null;

  const b =
    (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) /
    denominator;

  const c =
    (x2 * x3 * (x2 - x3) * y1 +
      x3 * x1 * (x3 - x1) * y2 +
      x1 * x2 * (x1 - x2) * y3) /
    denominator;

  const x = -b / (2 * a);
  const minX = Math.min(x1, x2, x3);
  const maxX = Math.max(x1, x2, x3);

  if (x < minX || x > maxX) return null;

  return {
    x,
    y: a * x * x + b * x + c,
  };
}
