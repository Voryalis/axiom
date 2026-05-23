import { all, create } from "mathjs";
import { graphToScreenX, graphToScreenY, type Viewport } from "./viewport";
import type { GraphPoint } from "./points";

const math = create(all, {});

type TableDataLike = {
  rows: Array<{
    cells: Record<string, string>;
  }>;
  connectLines: boolean;
};

export type EditableTableRow = {
  x: string;
  y: string;
};

export type EditableTable = {
  connect: boolean;
  rows: EditableTableRow[];
};

export type ParsedTable = {
  points: GraphPoint[];
  connect: boolean;
};

export type RenderedCurvePoint = {
  x: number;
  y: number;
  screenX: number;
  screenY: number;
};

export function parseStructuredTableExpression(
  tableData: TableDataLike | undefined,
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

export function parseTableExpression(
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

export function isTableExpression(rawExpression: string) {
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

export function parseEditableTable(rawExpression: string): EditableTable | null {
  const lines = rawExpression.split("\n").map((line) => line.trim());

  const firstContentIndex = lines.findIndex((line) => line.length > 0);

  if (firstContentIndex === -1) return null;

  const firstLine = lines[firstContentIndex]?.toLowerCase();

  const isPlainTable = firstLine === "table:" || firstLine === "table";
  const isConnectedTable =
    firstLine === "table lines:" ||
    firstLine === "table lines" ||
    firstLine === "table line:" ||
    firstLine === "table line";

  if (!isPlainTable && !isConnectedTable) return null;

  const dataLines = lines.slice(firstContentIndex + 1).filter(Boolean);
  const rows =
    dataLines[0]?.toLowerCase().replace(/\s/g, "") === "x,y"
      ? dataLines.slice(1)
      : dataLines;

  const tableRows = rows.map((row) => {
    const [x = "", y = ""] = row.split(",").map((part) => part.trim());

    return { x, y };
  });

  return {
    connect: isConnectedTable,
    rows: tableRows.length > 0 ? tableRows : [{ x: "", y: "" }],
  };
}

export function editableTableFromTableData(
  tableData: TableDataLike | undefined,
): EditableTable | null {
  if (!tableData) return null;

  const rows = tableData.rows.map((row) => ({
    x: row.cells.x ?? "",
    y: row.cells.y ?? "",
  }));

  return {
    connect: tableData.connectLines,
    rows: rows.length > 0 ? rows : [{ x: "", y: "" }],
  };
}

export function getEditableTable(expression: {
  raw: string;
  tableData?: TableDataLike;
}) {
  return (
    editableTableFromTableData(expression.tableData) ??
    parseEditableTable(expression.raw)
  );
}

export function isEditableTableRowEmpty(row: EditableTableRow) {
  return row.x.trim().length === 0 && row.y.trim().length === 0;
}

export function normalizeEditableTableRows(rows: EditableTableRow[]) {
  const normalizedRows = rows.map((row) => ({ ...row }));

  while (
    normalizedRows.length > 1 &&
    isEditableTableRowEmpty(normalizedRows[normalizedRows.length - 1]) &&
    isEditableTableRowEmpty(normalizedRows[normalizedRows.length - 2])
  ) {
    normalizedRows.pop();
  }

  const lastRow = normalizedRows[normalizedRows.length - 1];

  if (!lastRow || !isEditableTableRowEmpty(lastRow)) {
    normalizedRows.push({ x: "", y: "" });
  }

  return normalizedRows;
}

export function buildTableExpression(
  table: EditableTable,
  options: { preserveEmptyRows?: boolean } = {},
) {
  const header = table.connect ? "table lines:" : "table:";
  const sourceRows = table.rows.length > 0 ? table.rows : [{ x: "", y: "" }];
  const rows = options.preserveEmptyRows
    ? sourceRows
    : normalizeEditableTableRows(sourceRows);

  return [
    header,
    "x, y",
    ...rows.map((row) => `${row.x.trim()}, ${row.y.trim()}`),
  ].join("\n");
}

export function drawConnectedTableLines(
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
