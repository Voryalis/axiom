import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { all, create } from "mathjs";
import {
  INITIAL_VIEWPORT,
  enforceSquareUnits,
  getGridStep,
  graphToScreenX,
  graphToScreenY,
  screenToGraphX,
  screenToGraphY,
  type Viewport,
} from "../graph/viewport";

const math = create(all, {});

export type TableColumn = {
  id: string;
  label: string;
  color: string;
  visible: boolean;
};

export type TableRow = {
  id: string;
  cells: Record<string, string>;
};

export type TableData = {
  version: 1;
  columns: TableColumn[];
  rows: TableRow[];
  connectLines: boolean;
  showPoints: boolean;
};

export type GraphExpression = {
  id: string;
  raw: string;
  color: string;
  visible: boolean;
  showPoints?: boolean;
  showLabel?: boolean;
  tableData?: TableData;
};

type GraphCanvasProps = {
  expressions: GraphExpression[];
  showGrid: boolean;
  showMinorGrid: boolean;
  showAxes: boolean;
  showAxisLabels: boolean;
  showIntersections: boolean;
  onViewportDirtyChange?: (isDirty: boolean) => void;
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
  sourceExpressionId?: string;
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

const ZOOM_SENSITIVITY = 0.0015;
const POINT_HIT_RADIUS = 10;

const GraphCanvas = forwardRef<GraphCanvasHandle, GraphCanvasProps>(
  function GraphCanvas(
    {
      expressions,
      showGrid,
      showMinorGrid,
      showAxes,
      showAxisLabels,
      showIntersections,
      onViewportDirtyChange,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const viewportRef = useRef<Viewport>({ ...INITIAL_VIEWPORT });
    const isDraggingRef = useRef(false);
    const lastPointerRef = useRef({ x: 0, y: 0 });
    const renderedPointsRef = useRef<RenderedPoint[]>([]);
    const pinnedPointRef = useRef<RenderedPoint | null>(null);
    const isViewportInteractingRef = useRef(false);
    const viewportInteractionTimeoutRef = useRef<number | null>(null);

    function renderCurrentViewport() {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      const ctx = canvas?.getContext("2d");

      if (!canvas || !parent || !ctx) return;

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
        showGrid,
        showMinorGrid,
        showAxes,
        showAxisLabels,
        showIntersections && !isViewportInteractingRef.current,
      );

      renderedPointsRef.current = renderedPoints;
    }

    function drawPinnedPointLabel() {
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      const ctx = canvas?.getContext("2d");

      if (!canvas || !parent || !ctx) return;

      const rect = parent.getBoundingClientRect();

      const freshPinnedPoint = findMatchingRenderedPoint(
        pinnedPointRef.current,
        renderedPointsRef.current,
      );

      pinnedPointRef.current = freshPinnedPoint;

      if (freshPinnedPoint) {
        drawSelectedPointHighlight(ctx, freshPinnedPoint);
        drawPointLabel(ctx, rect.width, rect.height, freshPinnedPoint);
      }
    }

    function startViewportInteraction() {
      if (viewportInteractionTimeoutRef.current !== null) {
        window.clearTimeout(viewportInteractionTimeoutRef.current);
        viewportInteractionTimeoutRef.current = null;
      }

      isViewportInteractingRef.current = true;
    }

    function finishViewportInteraction() {
      if (viewportInteractionTimeoutRef.current !== null) {
        window.clearTimeout(viewportInteractionTimeoutRef.current);
      }

      viewportInteractionTimeoutRef.current = window.setTimeout(() => {
        isViewportInteractingRef.current = false;
        viewportInteractionTimeoutRef.current = null;
        renderCurrentViewport();
        drawPinnedPointLabel();
      }, 120);
    }

    function zoomViewport(factor: number) {
      onViewportDirtyChange?.(true);
      startViewportInteraction();
      const viewport = viewportRef.current;

      const centerX = (viewport.xMin + viewport.xMax) / 2;
      const centerY = (viewport.yMin + viewport.yMax) / 2;

      const halfWidth = ((viewport.xMax - viewport.xMin) * factor) / 2;
      const halfHeight = ((viewport.yMax - viewport.yMin) * factor) / 2;

      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      const rect = parent?.getBoundingClientRect();

      const nextViewport = {
        xMin: centerX - halfWidth,
        xMax: centerX + halfWidth,
        yMin: centerY - halfHeight,
        yMax: centerY + halfHeight,
      };

      viewportRef.current = rect
        ? enforceSquareUnits(nextViewport, rect.width, rect.height)
        : nextViewport;

      pinnedPointRef.current = null;

      renderCurrentViewport();
      finishViewportInteraction();
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
        pinnedPointRef.current = null;
        onViewportDirtyChange?.(false);
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

      const renderWithPinnedPointLabel = () => {
        renderCurrentViewport();
        drawPinnedPointLabel();
      };

      const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        event.stopPropagation();
        onViewportDirtyChange?.(true);
        startViewportInteraction();

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

        renderWithPinnedPointLabel();
        finishViewportInteraction();
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
          onViewportDirtyChange?.(true);
          startViewportInteraction();

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
          renderWithPinnedPointLabel();
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

        canvas.style.cursor = nearestPoint ? "pointer" : "grab";
      };

      const handlePointerUp = (event: PointerEvent) => {
        isDraggingRef.current = false;
        finishViewportInteraction();

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
        renderWithPinnedPointLabel();
      };

      const handlePointerLeave = () => {
        isDraggingRef.current = false;
        finishViewportInteraction();
        canvas.style.cursor = "grab";
        renderWithPinnedPointLabel();
      };

      const resetViewport = () => {
        isViewportInteractingRef.current = false;

        if (viewportInteractionTimeoutRef.current !== null) {
          window.clearTimeout(viewportInteractionTimeoutRef.current);
          viewportInteractionTimeoutRef.current = null;
        }

        viewportRef.current = { ...INITIAL_VIEWPORT };
        onViewportDirtyChange?.(false);
        renderWithPinnedPointLabel();
      };

      renderWithPinnedPointLabel();

      const resizeObserver = new ResizeObserver(renderWithPinnedPointLabel);
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
    }, [
      expressions,
      showGrid,
      showMinorGrid,
      showAxes,
      showAxisLabels,
      showIntersections,
      onViewportDirtyChange,
    ]);

    return <canvas ref={canvasRef} className="graph-canvas" />;
  },
);

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  expressions: GraphExpression[],
  viewport: Viewport,
  showGrid: boolean,
  showMinorGrid: boolean,
  showAxes: boolean,
  showAxisLabels: boolean,
  shouldFindIntersections: boolean,
) {
  const renderedPoints: RenderedPoint[] = [];
  const renderedCurves: RenderedCurve[] = [];

  ctx.clearRect(0, 0, width, height);

  drawBackground(ctx, width, height);

  if (showGrid) {
    drawGrid(ctx, width, height, viewport, showMinorGrid, showAxes);
  }

  if (showAxes) {
    drawAxes(ctx, width, height, viewport);
  }

  if (showAxes && showAxisLabels) {
    drawLabels(ctx, width, height, viewport);
  }

  const scope = buildEvaluationScope(expressions);

  for (const expression of expressions) {
    if (!expression.visible) continue;

    const table =
      parseStructuredTableExpression(expression.tableData, scope) ??
      parseTableExpression(expression.raw, scope);

    if (table && table.points.length > 0) {
      if (table.connect) {
        const tableCurvePoints = drawConnectedTableLines(
          ctx,
          width,
          height,
          table.points,
          expression.color,
          viewport,
        );

        if (tableCurvePoints.length > 1) {
          renderedCurves.push({
            expressionId: `${expression.id}-table-line`,
            color: expression.color,
            points: tableCurvePoints,
          });
        }
      }

      if (expression.showPoints !== false) {
        table.points.forEach((point, index) => {
          const renderedPoint = drawPoint(
            ctx,
            width,
            height,
            point,
            expression.color,
            `${expression.id}-table-${index}`,
            viewport,
            expression.id,
          );

          if (renderedPoint) {
            renderedPoints.push(renderedPoint);
          }
        });
      }

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

        if (expression.showLabel) {
          drawPointLabel(ctx, width, height, renderedPoint);
        }
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

  if (shouldFindIntersections) {
    const intersections = findCurveIntersections(renderedCurves);

    intersections.forEach((intersection) => {
      const renderedPoint = drawIntersectionPoint(ctx, intersection);

      if (renderedPoint) {
        renderedPoints.push(renderedPoint);
      }
    });
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

function parseStructuredTableExpression(
  tableData: TableData | undefined,
  scope: Record<string, number>,
): ParsedTable | null {
  if (!tableData) return null;

  const points: GraphPoint[] = [];

  for (const row of tableData.rows) {
    const rawX = row.cells.x?.trim() ?? "";
    const rawY = row.cells.y?.trim() ?? "";

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
    connect: tableData.connectLines,
  };
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

function parseInequalityExpression(
  rawExpression: string,
): ParsedInequality | null {
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

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.fillStyle = "#1d1e21";
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: Viewport,
  showMinorGrid: boolean,
  showAxes: boolean,
) {
  const majorStep = getGridStep(viewport.xMax - viewport.xMin);
  const minorStep = majorStep / 5;
  const step = showMinorGrid ? minorStep : majorStep;

  ctx.save();
  ctx.lineWidth = 1;

  const firstX = Math.ceil(viewport.xMin / step) * step;
  for (let x = firstX; x <= viewport.xMax; x += step) {
    if (showAxes && Math.abs(x) < step / 1000) continue;

    const sx = graphToScreenX(x, width, viewport);
    const isMajor = Math.abs(x / majorStep - Math.round(x / majorStep)) < 0.001;

    if (!showMinorGrid && !isMajor) continue;

    ctx.beginPath();
    ctx.strokeStyle = isMajor ? "#3b3f48" : "#272a30";
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
    ctx.stroke();
  }

  const firstY = Math.ceil(viewport.yMin / step) * step;
  for (let y = firstY; y <= viewport.yMax; y += step) {
    if (showAxes && Math.abs(y) < step / 1000) continue;

    const sy = graphToScreenY(y, height, viewport);
    const isMajor = Math.abs(y / majorStep - Math.round(y / majorStep)) < 0.001;

    if (!showMinorGrid && !isMajor) continue;

    ctx.beginPath();
    ctx.strokeStyle = isMajor ? "#3b3f48" : "#272a30";
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAxes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: Viewport,
) {
  const zeroX = graphToScreenX(0, width, viewport);
  const zeroY = graphToScreenY(0, height, viewport);

  ctx.save();
  ctx.strokeStyle = "#6b707c";
  ctx.lineWidth = 1.4;

  if (zeroX >= 0 && zeroX <= width) {
    ctx.beginPath();
    ctx.moveTo(zeroX, 0);
    ctx.lineTo(zeroX, height);
    ctx.stroke();
  }

  if (zeroY >= 0 && zeroY <= height) {
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();
  }

  ctx.restore();
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viewport: Viewport,
) {
  const step = getGridStep(viewport.xMax - viewport.xMin);

  ctx.save();
  ctx.font = "12px system-ui, sans-serif";
  ctx.textBaseline = "middle";

  const zeroY = graphToScreenY(0, height, viewport);
  const zeroX = graphToScreenX(0, width, viewport);

  const xLabelY = Math.min(Math.max(zeroY + 15, 16), height - 14);
  const yLabelX = Math.min(Math.max(zeroX + 8, 8), width - 44);

  const firstX = Math.ceil(viewport.xMin / step) * step;
  for (let x = firstX; x <= viewport.xMax; x += step) {
    if (Math.abs(x) < step / 1000) continue;

    const sx = graphToScreenX(x, width, viewport);
    const label = formatNumber(x);
    const isNegative = label.startsWith("-");
    const numberPart = isNegative ? label.slice(1) : label;

    const labelWidth = Math.ceil(ctx.measureText(label).width) + 8;
    const labelHeight = 16;
    const numberWidth = ctx.measureText(numberPart).width;
    const minusWidth = isNegative ? ctx.measureText("-").width : 0;

    const textX = isNegative
      ? Math.round(sx - numberWidth / 2 - minusWidth)
      : Math.round(sx - numberWidth / 2);

    const backingX = Math.round(textX - 4);
    const backingY = Math.round(xLabelY - labelHeight / 2);

    drawLabelBacking(ctx, backingX, backingY, labelWidth, labelHeight);

    ctx.fillStyle = "#8b949e";
    ctx.textAlign = "left";
    ctx.fillText(label, textX, xLabelY);
  }

  const firstY = Math.ceil(viewport.yMin / step) * step;
  for (let y = firstY; y <= viewport.yMax; y += step) {
    if (Math.abs(y) < step / 1000) continue;

    const sy = graphToScreenY(y, height, viewport);
    const label = formatNumber(y);
    const labelWidth = Math.ceil(ctx.measureText(label).width) + 8;
    const labelHeight = 16;

    const backingX = Math.round(yLabelX - 4);
    const backingY = Math.round(sy - labelHeight / 2);

    drawLabelBacking(ctx, backingX, backingY, labelWidth, labelHeight);

    ctx.fillStyle = "#8b949e";
    ctx.textAlign = "left";
    ctx.fillText(label, yLabelX, sy);
  }

  ctx.restore();
}

function drawLabelBacking(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.fillStyle = "rgba(29, 30, 33, 0.86)";
  ctx.fillRect(x, y, width, height);
  ctx.restore();
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
  const intersectionSampleStep = Math.max(1, Math.ceil(width / 320));

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

    if (px % intersectionSampleStep === 0 || px === width) {
      points.push({
        x,
        y,
        screenX: px,
        screenY: sy,
      });
    }

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
    drawVerticalInequality(
      ctx,
      width,
      height,
      inequality,
      color,
      viewport,
      scope,
    );
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
): RenderedCurvePoint[] {
  const renderedCurvePoints: RenderedCurvePoint[] = [];

  if (points.length < 2) return renderedCurvePoints;

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

    renderedCurvePoints.push({
      x: point.x,
      y: point.y,
      screenX: sx,
      screenY: sy,
    });

    if (!started) {
      ctx.moveTo(sx, sy);
      started = true;
    } else {
      ctx.lineTo(sx, sy);
    }
  }

  ctx.stroke();
  ctx.restore();

  return renderedCurvePoints;
}

function drawPoint(
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

function drawSelectedPointHighlight(
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
    const distance = Math.hypot(
      point.screenX - screenX,
      point.screenY - screenY,
    );

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
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < curves.length;
      secondIndex++
    ) {
      const firstCurve = curves[firstIndex];
      const secondCurve = curves[secondIndex];

      if (!firstCurve || !secondCurve) continue;
      if (firstCurve.points.length < 2 || secondCurve.points.length < 2)
        continue;

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

function findPointOnSegment(
  point: RenderedCurvePoint,
  segmentStart: RenderedCurvePoint,
  segmentEnd: RenderedCurvePoint,
) {
  const segmentLength = Math.hypot(
    segmentEnd.screenX - segmentStart.screenX,
    segmentEnd.screenY - segmentStart.screenY,
  );

  if (segmentLength < 0.0001) return null;

  const distanceToSegment =
    Math.abs(
      (segmentEnd.screenY - segmentStart.screenY) * point.screenX -
        (segmentEnd.screenX - segmentStart.screenX) * point.screenY +
        segmentEnd.screenX * segmentStart.screenY -
        segmentEnd.screenY * segmentStart.screenX,
    ) / segmentLength;

  if (distanceToSegment > 2) return null;

  const minX = Math.min(segmentStart.screenX, segmentEnd.screenX) - 2;
  const maxX = Math.max(segmentStart.screenX, segmentEnd.screenX) + 2;
  const minY = Math.min(segmentStart.screenY, segmentEnd.screenY) - 2;
  const maxY = Math.max(segmentStart.screenY, segmentEnd.screenY) + 2;

  if (
    point.screenX < minX ||
    point.screenX > maxX ||
    point.screenY < minY ||
    point.screenY > maxY
  ) {
    return null;
  }

  return {
    x: point.x,
    y: point.y,
    screenX: point.screenX,
    screenY: point.screenY,
  };
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
    const overlappingEndpoint =
      findPointOnSegment(b1, a1, a2) ?? findPointOnSegment(b2, a1, a2);

    return overlappingEndpoint;
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
