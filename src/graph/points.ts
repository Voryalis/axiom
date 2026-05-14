import { graphToScreenX, graphToScreenY, type Viewport } from "./viewport";

export type GraphPoint = {
  x: number;
  y: number;
};

export type RenderedPoint = {
  expressionId: string;
  sourceExpressionId?: string;
  point: GraphPoint;
  screenX: number;
  screenY: number;
  color: string;
};

const POINT_HIT_RADIUS = 10;

export function drawPoint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  point: GraphPoint,
  color: string,
  expressionId: string,
  viewport: Viewport,
  sourceExpressionId = expressionId,
): RenderedPoint | null {
  const sx = graphToScreenX(point.x, width, viewport);
  const sy = graphToScreenY(point.y, height, viewport);

  if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) {
    return null;
  }

  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#1d1e21";
  ctx.lineWidth = 2;
  ctx.arc(sx, sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  return {
    expressionId,
    sourceExpressionId,
    point,
    screenX: sx,
    screenY: sy,
    color,
  };
}

export function drawSelectedPointHighlight(
  ctx: CanvasRenderingContext2D,
  renderedPoint: RenderedPoint,
) {
  ctx.save();

  ctx.beginPath();
  ctx.strokeStyle = "#f0f6fc";
  ctx.lineWidth = 2;
  ctx.arc(renderedPoint.screenX, renderedPoint.screenY, 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

export function drawPointLabel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  renderedPoint: RenderedPoint,
) {
  const label = `(${formatNumber(renderedPoint.point.x)}, ${formatNumber(
    renderedPoint.point.y,
  )})`;

  ctx.save();

  ctx.font = "12px system-ui, sans-serif";

  const metrics = ctx.measureText(label);
  const labelWidth = metrics.width + 18;
  const labelHeight = 28;

  let x = renderedPoint.screenX + 12;
  let y = renderedPoint.screenY - labelHeight - 10;

  if (x + labelWidth > width - 8) {
    x = renderedPoint.screenX - labelWidth - 12;
  }

  if (y < 8) {
    y = renderedPoint.screenY + 14;
  }

  if (y + labelHeight > height - 8) {
    y = height - labelHeight - 8;
  }

  ctx.fillStyle = "#0d1117";
  ctx.strokeStyle = "#30363d";
  ctx.lineWidth = 1;

  roundRect(ctx, x, y, labelWidth, labelHeight, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f0f6fc";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 9, y + labelHeight / 2);

  ctx.restore();
}

export function findNearestPoint(
  points: RenderedPoint[],
  screenX: number,
  screenY: number,
) {
  let nearest: RenderedPoint | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const distance = Math.hypot(
      point.screenX - screenX,
      point.screenY - screenY,
    );

    if (distance <= POINT_HIT_RADIUS && distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  return nearest;
}

export function findMatchingRenderedPoint(
  point: RenderedPoint | null,
  points: RenderedPoint[],
) {
  if (!point) return null;

  return (
    points.find((candidate) => candidate.expressionId === point.expressionId) ??
    null
  );
}

function formatNumber(value: number) {
  const normalized = Math.abs(value) < 1e-9 ? 0 : value;
  const rounded = Number(normalized.toFixed(6));

  if (Object.is(rounded, -0)) return "0";

  return rounded.toString();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
