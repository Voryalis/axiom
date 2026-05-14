export type Viewport = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export const INITIAL_VIEWPORT: Viewport = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
};

export function enforceSquareUnits(
  viewport: Viewport,
  width: number,
  height: number,
): Viewport {
  const xRange = viewport.xMax - viewport.xMin;
  const yRange = xRange * (height / width);
  const yCenter = (viewport.yMin + viewport.yMax) / 2;

  return {
    xMin: viewport.xMin,
    xMax: viewport.xMax,
    yMin: yCenter - yRange / 2,
    yMax: yCenter + yRange / 2,
  };
}

export function graphToScreenX(x: number, width: number, viewport: Viewport) {
  return ((x - viewport.xMin) / (viewport.xMax - viewport.xMin)) * width;
}

export function graphToScreenY(y: number, height: number, viewport: Viewport) {
  return (
    height - ((y - viewport.yMin) / (viewport.yMax - viewport.yMin)) * height
  );
}

export function screenToGraphX(
  screenX: number,
  width: number,
  viewport: Viewport,
) {
  return viewport.xMin + (screenX / width) * (viewport.xMax - viewport.xMin);
}

export function screenToGraphY(
  screenY: number,
  height: number,
  viewport: Viewport,
) {
  return viewport.yMax - (screenY / height) * (viewport.yMax - viewport.yMin);
}

export function getGridStep(range: number) {
  const roughStep = range / 12;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;

  return 10 * magnitude;
}
