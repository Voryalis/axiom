import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
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

export type GraphCanvasHandle = {
  exportPng: () => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

type GraphPoint = {
  x: number;
  y: number;
};

type ParsedTable = {
  points: GraphPoint[];
  connect: boolean;
};

type RenderedPoint = {
  expressionId: string;
  point: GraphPoint;
  screenX: number;
  screenY: number;
  color: string;
};

const INITIAL_VIEWPORT: Viewport = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
};

const ZOOM_SENSITIVITY = 0.0015;
const POINT_HIT_RADIUS = 10;

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(function GraphCanvas(
  { expressions },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<Viewport>({ ...INITIAL_VIEWPORT });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const renderedPointsRef = useRef<RenderedPoint[]>([]);
  const hoveredPointRef = useRef<RenderedPoint | null>(null);
  const pinnedPointRef = useRef<RenderedPoint | null>(null);

    function renderCurrentViewport() {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !parent || !ctx) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const renderedPoints = draw(
      ctx,
      rect.width,
      rect.height,
      expressions,
      viewportRef.current,
    );

    renderedPointsRef.current = renderedPoints;
  }

  function zoomViewport(factor: number) {
    const viewport = viewportRef.current;

    const centerX = (viewport.xMin + viewport.xMax) / 2;
    const centerY = (viewport.yMin + viewport.yMax) / 2;

    const halfWidth = ((viewport.xMax - viewport.xMin) * factor) / 2;
    const halfHeight = ((viewport.yMax - viewport.yMin) * factor) / 2;

    viewportRef.current = {
      xMin: centerX - halfWidth,
      xMax: centerX + halfWidth,
      yMin: centerY - halfHeight,
      yMax: centerY + halfHeight,
    };

    hoveredPointRef.current = null;
    pinnedPointRef.current = null;

    renderCurrentViewport();
  }
  useImperativeHandle(ref, () => ({

        zoomIn() {
      zoomViewport(0.8);
    },
    zoomOut() {
      zoomViewport(1.25);
    },

    exportPng() {
      const canvas = canvasRef.current;

      if (!canvas) return;

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "axiom-graph.png";
      link.click();
    },
    resetView() {
      viewportRef.current = { ...INITIAL_VIEWPORT };

    

      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      const ctx = canvas?.getContext("2d");

      if (!canvas || !parent || !ctx) return;

      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderedPoints = draw(
        ctx,
        rect.width,
        rect.height,
        expressions,
        viewportRef.current,
      );

      renderedPointsRef.current = renderedPoints;
      hoveredPointRef.current = null;
      pinnedPointRef.current = null;
    },
  }));

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

      const renderedPoints = draw(
        ctx,
        rect.width,
        rect.height,
        expressions,
        viewportRef.current,
      );

      renderedPointsRef.current = renderedPoints;

      const freshPinnedPoint = findMatchingRenderedPoint(
        pinnedPointRef.current,
        renderedPoints,
      );
      const freshHoveredPoint = findMatchingRenderedPoint(
        hoveredPointRef.current,
        renderedPoints,
      );

      pinnedPointRef.current = freshPinnedPoint;
      hoveredPointRef.current = freshHoveredPoint;

      if (
        freshHoveredPoint &&
        freshHoveredPoint.expressionId !== freshPinnedPoint?.expressionId
      ) {
        drawPointLabel(ctx, rect.width, rect.height, freshHoveredPoint);
      }

      if (freshPinnedPoint) {
        drawPointLabel(ctx, rect.width, rect.height, freshPinnedPoint);
      }
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
      if (isDraggingRef.current) {
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
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const nearestPoint = findNearestPoint(
        renderedPointsRef.current,
        mouseX,
        mouseY,
      );

      const previousHoveredId = hoveredPointRef.current?.expressionId ?? null;
      const nextHoveredId = nearestPoint?.expressionId ?? null;

      if (previousHoveredId !== nextHoveredId) {
        hoveredPointRef.current = nearestPoint;
        canvas.style.cursor = nearestPoint ? "pointer" : "grab";
        render();
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      isDraggingRef.current = false;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const nearestPoint = findNearestPoint(
        renderedPointsRef.current,
        mouseX,
        mouseY,
      );

      pinnedPointRef.current = nearestPoint;
      render();
    };

    const handlePointerLeave = () => {
      isDraggingRef.current = false;
      hoveredPointRef.current = null;
      canvas.style.cursor = "grab";
      render();
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
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("dblclick", resetViewport);

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("dblclick", resetViewport);
    };
  }, [expressions]);

  return <canvas ref={canvasRef} className="graph-canvas" />;
});

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  expressions: GraphExpression[],
  viewport: Viewport,
) {
  const renderedPoints: RenderedPoint[] = [];

  ctx.clearRect(0, 0, width, height);

  drawBackground(ctx, width, height);
  drawGrid(ctx, width, height, viewport);
  drawLabels(ctx, width, height, viewport);

  const scope = buildEvaluationScope(expressions);

  for (const expression of expressions) {
    if (!expression.visible) continue;

    const table = parseTableExpression(expression.raw, scope);

    if (table && table.points.length > 0) {
      if (table.connect) {
        drawConnectedTableLines(
          ctx,
          width,
          height,
          table.points,
          expression.color,
          viewport,
        );
      }

      table.points.forEach((point, index) => {
        const renderedPoint = drawPoint(
          ctx,
          width,
          height,
          point,
          expression.color,
          `${expression.id}-table-${index}`,
          viewport,
        );

        if (renderedPoint) {
          renderedPoints.push(renderedPoint);
        }
      });

      continue;
    }

    const point = parsePointExpression(expression.raw, scope);

    if (point) {
      const renderedPoint = drawPoint(
        ctx,
        width,
        height,
        point,
        expression.color,
        expression.id,
        viewport,
      );

      if (renderedPoint) {
        renderedPoints.push(renderedPoint);
      }

      continue;
    }

    drawExpression(ctx, width, height, expression, viewport, scope);
  }

  return renderedPoints;
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

function parseTableExpression(
  rawExpression: string,
  scope: Record<string, number>,
): ParsedTable | null {
  const lines = rawExpression
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const firstLine = lines[0]?.toLowerCase();

  const isPlainTable = firstLine === "table:" || firstLine === "table";
  const isConnectedTable =
    firstLine === "table lines:" ||
    firstLine === "table lines" ||
    firstLine === "table line:" ||
    firstLine === "table line";

  if (!isPlainTable && !isConnectedTable) {
    return null;
  }

  const dataLines = lines.slice(1);
  const rows =
    dataLines[0]?.toLowerCase().replace(/\s/g, "") === "x,y"
      ? dataLines.slice(1)
      : dataLines;

  const points: GraphPoint[] = [];

  for (const row of rows) {
    const parts = row.split(",").map((part) => part.trim());

    if (parts.length !== 2) continue;

    const [rawX, rawY] = parts;

    if (!rawX || !rawY) continue;

    try {
      const x = math.evaluate(rawX, scope);
      const y = math.evaluate(rawY, scope);

      if (
        typeof x === "number" &&
        typeof y === "number" &&
        Number.isFinite(x) &&
        Number.isFinite(y)
      ) {
        points.push({ x, y });
      }
    } catch {
      continue;
    }
  }

  return {
    points,
    connect: isConnectedTable,
  };
}

function isTableExpression(rawExpression: string) {
  const firstLine = rawExpression
    .split("\n")
    .find((line) => line.trim().length > 0)
    ?.trim()
    .toLowerCase();

  return (
    firstLine === "table:" ||
    firstLine === "table" ||
    firstLine === "table lines:" ||
    firstLine === "table lines" ||
    firstLine === "table line:" ||
    firstLine === "table line"
  );
}

function isGraphLikeExpression(rawExpression: string) {
  return (
    rawExpression.trim().length > 0 &&
    !isVariableAssignment(rawExpression) &&
    !isTableExpression(rawExpression)
  );
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

function drawConnectedTableLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: GraphPoint[],
  color: string,
  viewport: Viewport,
) {
  if (points.length < 2) return;

  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  let started = false;

  for (const point of points) {
    const sx = graphToScreenX(point.x, width, viewport);
    const sy = graphToScreenY(point.y, height, viewport);

    if (sx < -40 || sx > width + 40 || sy < -40 || sy > height + 40) {
      started = false;
      continue;
    }

    if (!started) {
      ctx.moveTo(sx, sy);
      started = true;
    } else {
      ctx.lineTo(sx, sy);
    }
  }

  ctx.stroke();
  ctx.restore();
}

function drawPoint(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  point: GraphPoint,
  color: string,
  expressionId: string,
  viewport: Viewport,
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
    point,
    screenX: sx,
    screenY: sy,
    color,
  };
}

function drawPointLabel(
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

  ctx.fillStyle = "#24262b";
  ctx.strokeStyle = renderedPoint.color;
  ctx.lineWidth = 1.5;

  roundedRect(ctx, x, y, labelWidth, labelHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f1f1f1";
  ctx.fillText(label, x + 9, y + 18);

  ctx.restore();
}

function roundedRect(
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

function findNearestPoint(
  points: RenderedPoint[],
  screenX: number,
  screenY: number,
) {
  let nearestPoint: RenderedPoint | null = null;
  let nearestDistance = Infinity;

  for (const point of points) {
    const distance = Math.hypot(point.screenX - screenX, point.screenY - screenY);

    if (distance <= POINT_HIT_RADIUS && distance < nearestDistance) {
      nearestPoint = point;
      nearestDistance = distance;
    }
  }

  return nearestPoint;
}

function findMatchingRenderedPoint(
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
  if (value === 0) {
    return "0";
  }

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