import { useEffect, useRef } from "react";
import { all, create } from "mathjs";

const math = create(all, {});

type Viewport = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type GraphExpression = {
  id: string;
  raw: string;
  color: string;
  visible: boolean;
};

type GraphCanvasProps = {
  expressions: GraphExpression[];
};

type GraphPoint = {
  x: number;
  y: number;
};

const INITIAL_VIEWPORT: Viewport = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
};

const ZOOM_SENSITIVITY = 0.0015;

function GraphCanvas({ expressions }: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<Viewport>({ ...INITIAL_VIEWPORT });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const preventNativeZoom = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };

    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    window.addEventListener("wheel", preventNativeZoom, {
      passive: false,
      capture: true,
    });
    window.addEventListener("gesturestart", preventGesture, { passive: false });
    window.addEventListener("gesturechange", preventGesture, { passive: false });
    window.addEventListener("gestureend", preventGesture, { passive: false });

    return () => {
      window.removeEventListener("wheel", preventNativeZoom, { capture: true });
      window.removeEventListener("gesturestart", preventGesture);
      window.removeEventListener("gesturechange", preventGesture);
      window.removeEventListener("gestureend", preventGesture);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const enforceSquareUnits = (
      viewport: Viewport,
      width: number,
      height: number,
    ): Viewport => {
      const xRange = viewport.xMax - viewport.xMin;
      const yRange = xRange * (height / width);
      const yCenter = (viewport.yMin + viewport.yMax) / 2;

      return {
        xMin: viewport.xMin,
        xMax: viewport.xMax,
        yMin: yCenter - yRange / 2,
        yMax: yCenter + yRange / 2,
      };
    };

    const render = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      viewportRef.current = enforceSquareUnits(
        viewportRef.current,
        rect.width,
        rect.height,
      );

      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, rect.width, rect.height, expressions, viewportRef.current);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const rect = canvas.getBoundingClientRect();
      const viewport = viewportRef.current;

      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const graphX = screenToGraphX(mouseX, rect.width, viewport);
      const graphY = screenToGraphY(mouseY, rect.height, viewport);

      const rawZoomFactor = Math.exp(event.deltaY * ZOOM_SENSITIVITY);
      const zoomFactor = Math.min(Math.max(rawZoomFactor, 0.85), 1.15);

      const newXMin = graphX + (viewport.xMin - graphX) * zoomFactor;
      const newXMax = graphX + (viewport.xMax - graphX) * zoomFactor;
      const newYMin = graphY + (viewport.yMin - graphY) * zoomFactor;
      const newYMax = graphY + (viewport.yMax - graphY) * zoomFactor;

      viewportRef.current = enforceSquareUnits(
        {
          xMin: newXMin,
          xMax: newXMax,
          yMin: newYMin,
          yMax: newYMax,
        },
        rect.width,
        rect.height,
      );

      render();
    };

    const handlePointerDown = (event: PointerEvent) => {
      event.preventDefault();

      isDraggingRef.current = true;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current) return;

      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const viewport = viewportRef.current;
      const last = lastPointerRef.current;

      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;

      const graphDx = (dx / rect.width) * (viewport.xMax - viewport.xMin);
      const graphDy = (dy / rect.height) * (viewport.yMax - viewport.yMin);

      viewportRef.current = {
        xMin: viewport.xMin - graphDx,
        xMax: viewport.xMax - graphDx,
        yMin: viewport.yMin + graphDy,
        yMax: viewport.yMax + graphDy,
      };

      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      render();
    };

    const handlePointerUp = (event: PointerEvent) => {
      isDraggingRef.current = false;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const resetViewport = () => {
      viewportRef.current = { ...INITIAL_VIEWPORT };
      render();
    };

    render();

    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(parent);

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("dblclick", resetViewport);

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("dblclick", resetViewport);
    };
  }, [expressions]);

  return <canvas ref={canvasRef} className="graph-canvas" />;
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  expressions: GraphExpression[],
  viewport: Viewport,
) {
  ctx.clearRect(0, 0, width, height);

  drawBackground(ctx, width, height);
  drawGrid(ctx, width, height, viewport);
  drawLabels(ctx, width, height, viewport);

  const scope = buildEvaluationScope(expressions);

  for (const expression of expressions) {
    if (!expression.visible) continue;

    const point = parsePointExpression(expression.raw, scope);

    if (point) {
      drawPoint(ctx, width, height, point, expression.color, viewport);
      continue;
    }

    drawExpression(ctx, width, height, expression, viewport, scope);
  }
}

function normalizeExpression(raw: string) {
  const trimmed = raw.trim();

  if (trimmed.toLowerCase().startsWith("y=")) {
    return trimmed.slice(2).trim();
  }

  if (trimmed.toLowerCase().startsWith("y =")) {
    return trimmed.slice(3).trim();
  }

  return trimmed;
}

function isVariableAssignment(rawExpression: string) {
  const trimmed = rawExpression.trim();

  if (trimmed.toLowerCase().startsWith("y=")) return false;
  if (trimmed.toLowerCase().startsWith("y =")) return false;

  return /^[a-zA-Z]\w*\s*=/.test(trimmed);
}

function parseVariableAssignment(rawExpression: string) {
  const match = rawExpression.trim().match(/^([a-zA-Z]\w*)\s*=\s*(.+)$/);

  if (!match) return null;

  const [, name, expression] = match;

  if (!name || !expression) return null;

  return { name, expression };
}

function buildEvaluationScope(expressions: GraphExpression[]) {
  const scope: Record<string, number> = {};

  for (const item of expressions) {
    const assignment = parseVariableAssignment(item.raw);

    if (!assignment) continue;
    if (assignment.name === "x" || assignment.name === "y") continue;

    try {
      const value = math.evaluate(assignment.expression, scope);

      if (typeof value === "number" && Number.isFinite(value)) {
        scope[assignment.name] = value;
      }
    } catch {
      continue;
    }
  }

  return scope;
}

function parsePointExpression(
  rawExpression: string,
  scope: Record<string, number>,
): GraphPoint | null {
  const trimmed = rawExpression.trim();

  const match = trimmed.match(/^\(\s*(.+)\s*,\s*(.+)\s*\)$/);

  if (!match) return null;

  const [, rawX, rawY] = match;

  if (!rawX || !rawY) return null;

  try {
    const x = math.evaluate(rawX, scope);
    const y = math.evaluate(rawY, scope);

    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      return null;
    }

    return { x, y };
  } catch {
    return null;
  }
}

function isGraphLikeExpression(rawExpression: string) {
  return rawExpression.trim().length > 0 && !isVariableAssignment(rawExpression);
}

function graphToScreenX(x: number, width: number, viewport: Viewport) {
  return ((x - viewport.xMin) / (viewport.xMax - viewport.xMin)) * width;
}

function graphToScreenY(y: number, height: number, viewport: Viewport) {
  return height - ((y - viewport.yMin) / (viewport.yMax - viewport.yMin)) * height;
}

function screenToGraphX(screenX: number, width: number, viewport: Viewport) {
  return viewport.xMin + (screenX / width) * (viewport.xMax - viewport.xMin);
}

function screenToGraphY(screenY: number, height: number, viewport: Viewport) {
  return viewport.yMax - (screenY / height) * (viewport.yMax - viewport.yMin);
}

function getGridStep(range: number) {
  const roughStep = range / 20;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;

  if (normalized < 2) return magnitude;
  if (normalized < 5) return 2 * magnitude;
  return 5 * magnitude;
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = "#1d1e21";
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: Viewport,
) {
  const step = getGridStep(viewport.xMax - viewport.xMin);

  ctx.lineWidth = 1;

  const firstX = Math.ceil(viewport.xMin / step) * step;
  for (let x = firstX; x <= viewport.xMax; x += step) {
    const sx = graphToScreenX(x, width, viewport);

    ctx.beginPath();
    ctx.strokeStyle = Math.abs(x) < step / 1000 ? "#555963" : "#2a2c31";
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
    ctx.stroke();
  }

  const firstY = Math.ceil(viewport.yMin / step) * step;
  for (let y = firstY; y <= viewport.yMax; y += step) {
    const sy = graphToScreenY(y, height, viewport);

    ctx.beginPath();
    ctx.strokeStyle = Math.abs(y) < step / 1000 ? "#555963" : "#2a2c31";
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
    ctx.stroke();
  }
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: Viewport,
) {
  const step = getGridStep(viewport.xMax - viewport.xMin);

  ctx.fillStyle = "#8b909b";
  ctx.font = "12px system-ui, sans-serif";

  const zeroY = graphToScreenY(0, height, viewport);
  const zeroX = graphToScreenX(0, width, viewport);

  const firstX = Math.ceil(viewport.xMin / step) * step;
  for (let x = firstX; x <= viewport.xMax; x += step) {
    if (Math.abs(x) < step / 1000) continue;

    const sx = graphToScreenX(x, width, viewport);
    const labelY = Math.min(Math.max(zeroY + 16, 18), height - 8);

    ctx.fillText(formatNumber(x), sx + 4, labelY);
  }

  const firstY = Math.ceil(viewport.yMin / step) * step;
  for (let y = firstY; y <= viewport.yMax; y += step) {
    if (Math.abs(y) < step / 1000) continue;

    const sy = graphToScreenY(y, height, viewport);
    const labelX = Math.min(Math.max(zeroX + 6, 6), width - 42);

    ctx.fillText(formatNumber(y), labelX, sy - 4);
  }
}

function drawExpression(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  graphExpression: GraphExpression,
  viewport: Viewport,
  scope: Record<string, number>,
) {
  if (!isGraphLikeExpression(graphExpression.raw)) return;

  const expression = normalizeExpression(graphExpression.raw);

  if (!expression) return;

  let compiled;

  try {
    compiled = math.compile(expression);
  } catch {
    drawError(ctx, "Invalid expression");
    return;
  }

  ctx.beginPath();
  ctx.strokeStyle = graphExpression.color;
  ctx.lineWidth = 2.5;

  let started = false;

  for (let px = 0; px <= width; px++) {
    const x = screenToGraphX(px, width, viewport);

    let y: unknown;

    try {
      y = compiled.evaluate({ ...scope, x });
    } catch {
      started = false;
      continue;
    }

    if (typeof y !== "number" || !Number.isFinite(y)) {
      started = false;
      continue;
    }

    const sy = graphToScreenY(y, height, viewport);

    if (sy < -height || sy > height * 2) {
      started = false;
      continue;
    }

    if (!started) {
      ctx.moveTo(px, sy);
      started = true;
    } else {
      ctx.lineTo(px, sy);
    }
  }

  ctx.stroke();
}

function drawPoint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  point: GraphPoint,
  color: string,
  viewport: Viewport,
) {
  const sx = graphToScreenX(point.x, width, viewport);
  const sy = graphToScreenY(point.y, height, viewport);

  if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) {
    return;
  }

  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#1d1e21";
  ctx.lineWidth = 2;
  ctx.arc(sx, sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function formatNumber(value: number) {
  if (Math.abs(value) >= 1000 || Math.abs(value) < 0.01) {
    return value.toExponential(1);
  }

  return Number(value.toFixed(4)).toString();
}

function drawError(ctx: CanvasRenderingContext2D, message: string) {
  ctx.fillStyle = "#f28b82";
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(message, 24, 32);
}

export default GraphCanvas;