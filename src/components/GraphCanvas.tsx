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

type ParsedInequality = {
  variable: "x" | "y";
  operator: ">" | ">=" | "<" | "<=";
  expression: string;
};

type ParsedEquation = {
  left: string;
  right: string;
};

type RenderedPoint = {
  expressionId: string;
  point: GraphPoint;
  screenX: number;
  screenY: number;
  color: string;
};

type RenderedCurvePoint = {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
};

type RenderedCurve = {
  expressionId: string;
  color: string;
  points: RenderedCurvePoint[];
};

const INITIAL_VIEWPORT: Viewport = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
};

const ZOOM_SENSITIVITY = 0.0015;
const POINT_HIT_RADIUS = 10;

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(
  function GraphCanvas({ expressions }, ref) {
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
        hoveredPointRef.current = null;
        pinnedPointRef.current = null;
        renderCurrentViewport();
      },
      zoomIn() {
        zoomViewport(0.8);
      },
      zoomOut() {
        zoomViewport(1.25);
      },
    }));

    useEffect(() => {
      const preventNativeZoom = (event: WheelEvent) => {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          event.stopPropagation();
        }
      };

      const preventGesture = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
      };

      document.addEventListener("wheel", preventNativeZoom, {
        passive: false,
        capture: true,
      });

      window.addEventListener("wheel", preventNativeZoom, {
        passive: false,
        capture: true,
      });

      document.addEventListener("gesturestart", preventGesture, {
        passive: false,
        capture: true,
      });
      document.addEventListener("gesturechange", preventGesture, {
        passive: false,
        capture: true,
      });
      document.addEventListener("gestureend", preventGesture, {
        passive: false,
        capture: true,
      });

      return () => {
        document.removeEventListener("wheel", preventNativeZoom, {
          capture: true,
        });
        window.removeEventListener("wheel", preventNativeZoom, {
          capture: true,
        });
        document.removeEventListener("gesturestart", preventGesture, {
          capture: true,
        });
        document.removeEventListener("gesturechange", preventGesture, {
          capture: true,
        });
        document.removeEventListener("gestureend", preventGesture, {
          capture: true,
        });
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
  },
);

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  expressions: GraphExpression[],
  viewport: Viewport,
) {
  const renderedPoints: RenderedPoint[] = [];
  const renderedCurves: RenderedCurve[] = [];

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

    const inequality = parseInequalityExpression(expression.raw);

    if (inequality) {
      drawInequality(
        ctx,
        width,
        height,
        inequality,
        expression.color,
        viewport,
        scope,
      );

      continue;
    }

    const equation = parseEquationExpression(expression.raw);

    if (equation) {
      const renderedCurve = drawEquation(
        ctx,
        width,
        height,
        equation,
        expression.id,
        expression.color,
        viewport,
        scope,
      );

      if (renderedCurve) {
        renderedCurves.push(renderedCurve);
      }

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

    const renderedCurve = drawExpression(
      ctx,
      width,
      height,
      expression,
      viewport,
      scope,
    );

    if (renderedCurve) {
      renderedCurves.push(renderedCurve);
    }
  }

  const intersections = findCurveIntersections(renderedCurves);

  intersections.forEach((intersection) => {
    const renderedPoint = drawIntersectionPoint(ctx, intersection);

    if (renderedPoint) {
      renderedPoints.push(renderedPoint);
    }
  });

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

function parseSliderConfig(expression: string) {
  const trimmed = expression.trim();
  const match = trimmed.match(
    /^(.*?)\s*\[\s*(-?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(-?(?:\d+(?:\.\d+)?|\.\d+))(?:\s*,\s*(-?(?:\d+(?:\.\d+)?|\.\d+)))?\s*\]\s*$/,
  );

  if (!match) {
    return {
      expression: trimmed,
    };
  }

  const [, rawExpression] = match;

  return {
    expression: rawExpression?.trim() || trimmed,
  };
}

function buildEvaluationScope(expressions: GraphExpression[]) {
  const scope: Record<string, number> = {};

  for (const item of expressions) {
    const assignment = parseVariableAssignment(item.raw);

    if (!assignment) continue;
    if (assignment.name === "x" || assignment.name === "y") continue;

    try {
      const sliderConfig = parseSliderConfig(assignment.expression);
      const value = math.evaluate(sliderConfig.expression, scope);

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

function parseInequalityExpression(rawExpression: string): ParsedInequality | null {
  const trimmed = rawExpression.trim();
  const match = trimmed.match(/^(x|y)\s*(>=|<=|>|<)\s*(.+)$/i);

  if (!match) return null;

  const [, variable, operator, expression] = match;

  if (variable !== "x" && variable !== "y") return null;

  if (
    operator !== ">" &&
    operator !== ">=" &&
    operator !== "<" &&
    operator !== "<="
  ) {
    return null;
  }

  if (!expression?.trim()) return null;

  return {
    variable,
    operator,
    expression: expression.trim(),
  };
}

function parseEquationExpression(rawExpression: string): ParsedEquation | null {
  const trimmed = rawExpression.trim();
  const match = trimmed.match(/^(.+?)\s*=\s*(.+)$/);

  if (!match) return null;

  const [, left, right] = match;

  if (!left?.trim() || !right?.trim()) return null;

  const normalizedLeft = left.trim();

  if (
    /^[a-zA-Z]\w*$/.test(normalizedLeft) &&
    normalizedLeft !== "x" &&
    normalizedLeft !== "y"
  ) {
    return null;
  }

  return {
    left: normalizedLeft,
    right: right.trim(),
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
    !isTableExpression(rawExpression) &&
    !parseInequalityExpression(rawExpression) &&
    !parseEquationExpression(rawExpression)
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
  const majorStep = getGridStep(viewport.xMax - viewport.xMin);
  const minorStep = majorStep / 5;

  ctx.lineWidth = 1;

  const firstMinorX = Math.ceil(viewport.xMin / minorStep) * minorStep;
  for (let x = firstMinorX; x <= viewport.xMax; x += minorStep) {
    const sx = graphToScreenX(x, width, viewport);
    const isAxis = Math.abs(x) < minorStep / 1000;
    const isMajor = Math.abs(x / majorStep - Math.round(x / majorStep)) < 0.001;

    ctx.beginPath();
    ctx.strokeStyle = isAxis ? "#6b707c" : isMajor ? "#3b3f48" : "#272a30";
    ctx.lineWidth = isAxis ? 1.4 : 1;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
    ctx.stroke();
  }

  const firstMinorY = Math.ceil(viewport.yMin / minorStep) * minorStep;
  for (let y = firstMinorY; y <= viewport.yMax; y += minorStep) {
    const sy = graphToScreenY(y, height, viewport);
    const isAxis = Math.abs(y) < minorStep / 1000;
    const isMajor = Math.abs(y / majorStep - Math.round(y / majorStep)) < 0.001;

    ctx.beginPath();
    ctx.strokeStyle = isAxis ? "#6b707c" : isMajor ? "#3b3f48" : "#272a30";
    ctx.lineWidth = isAxis ? 1.4 : 1;
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
): RenderedCurve | null {
  if (!isGraphLikeExpression(graphExpression.raw)) return null;

  const expression = normalizeExpression(graphExpression.raw);

  if (!expression) return null;

  let compiled;

  try {
    compiled = math.compile(expression);
  } catch {
    drawError(ctx, "Invalid expression");
    return null;
  }

  const points = drawCompiledYExpression(
    ctx,
    width,
    height,
    compiled,
    graphExpression.color,
    viewport,
    scope,
  );

  return {
    expressionId: graphExpression.id,
    color: graphExpression.color,
    points,
  };
}

function drawEquation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  equation: ParsedEquation,
  expressionId: string,
  color: string,
  viewport: Viewport,
  scope: Record<string, number>,
): RenderedCurve | null {
  const left = equation.left.trim();
  const right = equation.right.trim();

  if (left === "y" && !usesVariable(right, "y")) {
    return drawYEquation(
      ctx,
      width,
      height,
      right,
      expressionId,
      color,
      viewport,
      scope,
    );
  }

  if (left === "x" && right === "y") {
    return drawYEquation(
      ctx,
      width,
      height,
      "x",
      expressionId,
      color,
      viewport,
      scope,
    );
  }

  if (left === "x" && !usesVariable(right, "x") && !usesVariable(right, "y")) {
    return drawXEquation(
      ctx,
      width,
      height,
      right,
      expressionId,
      color,
      viewport,
      scope,
    );
  }

  drawImplicitEquation(ctx, width, height, left, right, color, viewport, scope);
  return null;
}

function drawYEquation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  right: string,
  expressionId: string,
  color: string,
  viewport: Viewport,
  scope: Record<string, number>,
): RenderedCurve | null {
  let compiled;

  try {
    compiled = math.compile(right);
  } catch {
    drawError(ctx, "Invalid equation");
    return null;
  }

  const points = drawCompiledYExpression(
    ctx,
    width,
    height,
    compiled,
    color,
    viewport,
    scope,
  );

  return {
    expressionId,
    color,
    points,
  };
}

function drawXEquation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  right: string,
  expressionId: string,
  color: string,
  viewport: Viewport,
  scope: Record<string, number>,
): RenderedCurve | null {
  const normalized = right.trim();

  if (normalized.toLowerCase() === "y") {
    return drawYEquation(
      ctx,
      width,
      height,
      "x",
      expressionId,
      color,
      viewport,
      scope,
    );
  }

  let value: unknown;

  try {
    value = math.evaluate(normalized, scope);
  } catch {
    drawError(ctx, "Invalid equation");
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    drawError(ctx, "Invalid equation");
    return null;
  }

  const sx = graphToScreenX(value, width, viewport);

  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.moveTo(sx, 0);
  ctx.lineTo(sx, height);
  ctx.stroke();
  ctx.restore();

  return {
    expressionId,
    color,
    points: [
      {
        x: value,
        y: viewport.yMax,
        screenX: sx,
        screenY: 0,
      },
      {
        x: value,
        y: viewport.yMin,
        screenX: sx,
        screenY: height,
      },
    ],
  };
}

function drawImplicitEquation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  left: string,
  right: string,
  color: string,
  viewport: Viewport,
  scope: Record<string, number>,
) {
  let compiled;

  try {
    compiled = math.compile(`(${left}) - (${right})`);
  } catch {
    drawError(ctx, "Invalid equation");
    return;
  }

  const evaluate = (screenX: number, screenY: number) => {
    const x = screenToGraphX(screenX, width, viewport);
    const y = screenToGraphY(screenY, height, viewport);

    try {
      const value = compiled.evaluate({ ...scope, x, y });

      if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
      }

      return value;
    } catch {
      return null;
    }
  };

  const step = 6;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (let screenX = 0; screenX < width; screenX += step) {
    for (let screenY = 0; screenY < height; screenY += step) {
      const x0 = screenX;
      const x1 = Math.min(screenX + step, width);
      const y0 = screenY;
      const y1 = Math.min(screenY + step, height);

      const topLeft = evaluate(x0, y0);
      const topRight = evaluate(x1, y0);
      const bottomRight = evaluate(x1, y1);
      const bottomLeft = evaluate(x0, y1);

      if (
        topLeft === null ||
        topRight === null ||
        bottomRight === null ||
        bottomLeft === null
      ) {
        continue;
      }

      const intersections = [
        interpolateZeroCrossing(x0, y0, topLeft, x1, y0, topRight),
        interpolateZeroCrossing(x1, y0, topRight, x1, y1, bottomRight),
        interpolateZeroCrossing(x0, y1, bottomLeft, x1, y1, bottomRight),
        interpolateZeroCrossing(x0, y0, topLeft, x0, y1, bottomLeft),
      ].filter((point): point is GraphPoint => point !== null);

      if (intersections.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(intersections[0].x, intersections[0].y);
      ctx.lineTo(intersections[1].x, intersections[1].y);
      ctx.stroke();

      if (intersections.length >= 4) {
        ctx.beginPath();
        ctx.moveTo(intersections[2].x, intersections[2].y);
        ctx.lineTo(intersections[3].x, intersections[3].y);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

function drawCompiledYExpression(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  compiled: { evaluate: (scope?: Record<string, number>) => unknown },
  color: string,
  viewport: Viewport,
  scope: Record<string, number>,
): RenderedCurvePoint[] {
  const points: RenderedCurvePoint[] = [];

  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = color;
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

    points.push({
      x,
      y,
      screenX: px,
      screenY: sy,
    });

    if (!started) {
      ctx.moveTo(px, sy);
      started = true;
    } else {
      ctx.lineTo(px, sy);
    }
  }

  ctx.stroke();
  ctx.restore();

  return points;
}

function drawInequality(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  inequality: ParsedInequality,
  color: string,
  viewport: Viewport,
  scope: Record<string, number>,
) {
  if (inequality.variable === "x") {
    drawVerticalInequality(ctx, width, height, inequality, color, viewport, scope);
    return;
  }

  drawYInequality(ctx, width, height, inequality, color, viewport, scope);
}

function drawYInequality(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  inequality: ParsedInequality,
  color: string,
  viewport: Viewport,
  scope: Record<string, number>,
) {
  let compiled;

  try {
    compiled = math.compile(inequality.expression);
  } catch {
    drawError(ctx, "Invalid inequality");
    return;
  }

  ctx.save();
  ctx.fillStyle = hexToRgba(color, 0.14);

  for (let px = 0; px <= width; px++) {
    const x = screenToGraphX(px, width, viewport);

    let y: unknown;

    try {
      y = compiled.evaluate({ ...scope, x });
    } catch {
      continue;
    }

    if (typeof y !== "number" || !Number.isFinite(y)) continue;

    const sy = graphToScreenY(y, height, viewport);

    if (inequality.operator === ">" || inequality.operator === ">=") {
      ctx.fillRect(px, 0, 1, Math.max(0, sy));
    } else {
      ctx.fillRect(px, Math.min(height, sy), 1, Math.max(0, height - sy));
    }
  }

  drawInequalityBoundary(
    ctx,
    width,
    height,
    color,
    inequality.operator,
    (px) => {
      const x = screenToGraphX(px, width, viewport);
      const y = compiled.evaluate({ ...scope, x });

      if (typeof y !== "number" || !Number.isFinite(y)) return null;

      return {
        screenX: px,
        screenY: graphToScreenY(y, height, viewport),
      };
    },
  );

  ctx.restore();
}

function drawVerticalInequality(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  inequality: ParsedInequality,
  color: string,
  viewport: Viewport,
  scope: Record<string, number>,
) {
  let value: unknown;

  try {
    value = math.evaluate(inequality.expression, scope);
  } catch {
    drawError(ctx, "Invalid inequality");
    return;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    drawError(ctx, "Invalid inequality");
    return;
  }

  const sx = graphToScreenX(value, width, viewport);

  ctx.save();
  ctx.fillStyle = hexToRgba(color, 0.14);

  if (inequality.operator === ">" || inequality.operator === ">=") {
    ctx.fillRect(Math.max(0, sx), 0, Math.max(0, width - sx), height);
  } else {
    ctx.fillRect(0, 0, Math.min(width, sx), height);
  }

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;

  if (inequality.operator === ">" || inequality.operator === "<") {
    ctx.setLineDash([8, 6]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.moveTo(sx, 0);
  ctx.lineTo(sx, height);
  ctx.stroke();

  ctx.restore();
}

function drawInequalityBoundary(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  operator: ParsedInequality["operator"],
  getPoint: (screenX: number) => { screenX: number; screenY: number } | null,
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;

  if (operator === ">" || operator === "<") {
    ctx.setLineDash([8, 6]);
  } else {
    ctx.setLineDash([]);
  }

  let started = false;

  for (let px = 0; px <= width; px++) {
    let point: { screenX: number; screenY: number } | null = null;

    try {
      point = getPoint(px);
    } catch {
      started = false;
      continue;
    }

    if (!point) {
      started = false;
      continue;
    }

    if (point.screenY < -height || point.screenY > height * 2) {
      started = false;
      continue;
    }

    if (!started) {
      ctx.moveTo(point.screenX, point.screenY);
      started = true;
    } else {
      ctx.lineTo(point.screenX, point.screenY);
    }
  }

  ctx.stroke();
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    return `rgba(138, 180, 248, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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

function drawIntersectionPoint(
  ctx: CanvasRenderingContext2D,
  intersection: RenderedPoint,
): RenderedPoint | null {
  ctx.save();

  ctx.beginPath();
  ctx.fillStyle = "#f1f1f1";
  ctx.strokeStyle = intersection.color;
  ctx.lineWidth = 2;
  ctx.arc(intersection.screenX, intersection.screenY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  return intersection;
}

function findCurveIntersections(curves: RenderedCurve[]) {
  const intersections: RenderedPoint[] = [];

  for (let firstIndex = 0; firstIndex < curves.length; firstIndex++) {
    for (let secondIndex = firstIndex + 1; secondIndex < curves.length; secondIndex++) {
      const firstCurve = curves[firstIndex];
      const secondCurve = curves[secondIndex];

      if (!firstCurve || !secondCurve) continue;
      if (firstCurve.points.length < 2 || secondCurve.points.length < 2) continue;

      for (let i = 0; i < firstCurve.points.length - 1; i++) {
        const a1 = firstCurve.points[i];
        const a2 = firstCurve.points[i + 1];

        if (!a1 || !a2) continue;

        for (let j = 0; j < secondCurve.points.length - 1; j++) {
          const b1 = secondCurve.points[j];
          const b2 = secondCurve.points[j + 1];

          if (!b1 || !b2) continue;

          const intersection = findSegmentIntersection(a1, a2, b1, b2);

          if (!intersection) continue;
          if (isDuplicateIntersection(intersection, intersections)) continue;

          intersections.push({
            expressionId: `intersection-${intersections.length}`,
            point: {
              x: intersection.x,
              y: intersection.y,
            },
            screenX: intersection.screenX,
            screenY: intersection.screenY,
            color: mixIntersectionColor(firstCurve.color, secondCurve.color),
          });

          if (intersections.length >= 80) {
            return intersections;
          }
        }
      }
    }
  }

  return intersections;
}

function findSegmentIntersection(
  a1: RenderedCurvePoint,
  a2: RenderedCurvePoint,
  b1: RenderedCurvePoint,
  b2: RenderedCurvePoint,
) {
  const x1 = a1.screenX;
  const y1 = a1.screenY;
  const x2 = a2.screenX;
  const y2 = a2.screenY;

  const x3 = b1.screenX;
  const y3 = b1.screenY;
  const x4 = b2.screenX;
  const y4 = b2.screenY;

  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denominator) < 0.0001) {
    return null;
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

  if (t < 0 || t > 1 || u < 0 || u > 1) {
    return null;
  }

  return {
    x: a1.x + (a2.x - a1.x) * t,
    y: a1.y + (a2.y - a1.y) * t,
    screenX: x1 + (x2 - x1) * t,
    screenY: y1 + (y2 - y1) * t,
  };
}

function isDuplicateIntersection(
  intersection: {
    screenX: number;
    screenY: number;
  },
  intersections: RenderedPoint[],
) {
  return intersections.some((candidate) => {
    return (
      Math.hypot(
        candidate.screenX - intersection.screenX,
        candidate.screenY - intersection.screenY,
      ) < 10
    );
  });
}

function mixIntersectionColor(firstColor: string, secondColor: string) {
  if (firstColor === secondColor) return firstColor;

  return "#f1f1f1";
}

function usesVariable(expression: string, variable: "x" | "y") {
  return new RegExp(`\\b${variable}\\b`).test(expression);
}

function interpolateZeroCrossing(
  x1: number,
  y1: number,
  value1: number,
  x2: number,
  y2: number,
  value2: number,
): GraphPoint | null {
  if (value1 === 0) {
    return { x: x1, y: y1 };
  }

  if (value2 === 0) {
    return { x: x2, y: y2 };
  }

  if ((value1 > 0 && value2 > 0) || (value1 < 0 && value2 < 0)) {
    return null;
  }

  const amount = Math.abs(value1) / (Math.abs(value1) + Math.abs(value2));

  return {
    x: x1 + (x2 - x1) * amount,
    y: y1 + (y2 - y1) * amount,
  };
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "undefined";
  }

  if (Math.abs(value) < 1e-8) {
    return "0";
  }

  const nearestInteger = Math.round(value);

  if (Math.abs(value - nearestInteger) < 0.001) {
    return nearestInteger.toString();
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