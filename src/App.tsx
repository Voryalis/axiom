import { useEffect, useMemo, useRef, useState } from "react";
import { all, create } from "mathjs";
import GraphCanvas, {
  type GraphCanvasHandle,
  type GraphExpression,
} from "./components/GraphCanvas";
import "./App.css";

const math = create(all, {});

const GRAPH_LIBRARY_KEY = "axiom.graphLibrary";
const APP_SETTINGS_KEY = "axiom.appSettings";

type SavedGraph = {
  id: string;
  version: number;
  title: string;
  expressions: GraphExpression[];
  updatedAt: string;
};

type AppSettings = {
  showAxisLabels: boolean;
};

type EditableTableRow = {
  x: string;
  y: string;
};

type EditableTable = {
  connect: boolean;
  rows: EditableTableRow[];
};

const COLORS = ["#8ab4f8", "#a8d08d", "#f6c177", "#c4a7e7", "#f28b82"];

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;

  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePrime = hue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime >= 1 && huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime >= 2 && huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime >= 3 && huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime >= 4 && huePrime < 5) {
    red = x;
    blue = chroma;
  } else if (huePrime >= 5 && huePrime < 6) {
    red = chroma;
    blue = x;
  }

  const match = l - chroma / 2;

  const toHex = (value: number) => {
    const channel = Math.round((value + match) * 255);
    return channel.toString(16).padStart(2, "0");
  };

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function generateExpressionColor(index: number) {
  if (index < COLORS.length) return COLORS[index];

  const generatedIndex = index - COLORS.length;
  const hue = (generatedIndex * 137.508 + 28) % 360;

  return hslToHex(hue, 78, 72);
}

function createEmptyExpression(index: number): GraphExpression {
  return {
    id: crypto.randomUUID(),
    raw: "",
    color: generateExpressionColor(index),
    visible: true,
    showPoints: true,
    showLabel: false,
  };
}

function createDefaultExpressions(): GraphExpression[] {
  return [createEmptyExpression(0)];
}

function isValidExpression(value: unknown): value is GraphExpression {
  if (typeof value !== "object" || value === null) return false;

  const expression = value as GraphExpression;

  return (
    typeof expression.id === "string" &&
    typeof expression.raw === "string" &&
    typeof expression.color === "string" &&
    typeof expression.visible === "boolean" &&
    (typeof expression.showPoints === "boolean" ||
      typeof expression.showPoints === "undefined") &&
    (typeof expression.showLabel === "boolean" ||
      typeof expression.showLabel === "undefined")
  );
}

function createTableDataFromEditableTable(
  table: EditableTable,
  color: string,
  previousTableData?: GraphExpression["tableData"],
  showPoints = previousTableData?.showPoints ?? true,
  options: { preserveEmptyRows?: boolean } = {},
): NonNullable<GraphExpression["tableData"]> {
  const sourceRows = table.rows.length > 0 ? table.rows : [{ x: "", y: "" }];
  const rows = options.preserveEmptyRows
    ? sourceRows
    : normalizeEditableTableRows(sourceRows);

  return {
    version: 1,
    columns: previousTableData?.columns ?? [
      {
        id: "x",
        label: "x",
        color,
        visible: true,
      },
      {
        id: "y",
        label: "y",
        color,
        visible: true,
      },
    ],
    rows: rows.map((row, index) => ({
      id: previousTableData?.rows[index]?.id ?? crypto.randomUUID(),
      cells: {
        x: row.x,
        y: row.y,
      },
    })),
    connectLines: table.connect,
    showPoints,
  };
}

function normalizeExpression(expression: GraphExpression): GraphExpression {
  const showPoints =
    typeof expression.showPoints === "boolean" ? expression.showPoints : true;

  const parsedTable = parseEditableTable(expression.raw);

  return {
    ...expression,
    showPoints,
    showLabel:
      typeof expression.showLabel === "boolean" ? expression.showLabel : false,
    tableData:
      expression.tableData ??
      (parsedTable
        ? createTableDataFromEditableTable(
            parsedTable,
            expression.color,
            undefined,
            showPoints,
          )
        : undefined),
  };
}

function isValidSavedGraph(value: unknown): value is SavedGraph {
  if (typeof value !== "object" || value === null) return false;

  const graph = value as SavedGraph;

  return (
    typeof graph.title === "string" &&
    Array.isArray(graph.expressions) &&
    graph.expressions.every(isValidExpression)
  );
}

function normalizeGraph(value: SavedGraph): SavedGraph {
  return {
    id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
    version: typeof value.version === "number" ? value.version : 1,
    title: value.title,
    expressions: value.expressions.map(normalizeExpression),
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

function loadGraphLibrary(): SavedGraph[] {
  try {
    const raw = localStorage.getItem(GRAPH_LIBRARY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidSavedGraph).map(normalizeGraph);
  } catch {
    return [];
  }
}

function saveGraphLibrary(graphs: SavedGraph[]) {
  localStorage.setItem(GRAPH_LIBRARY_KEY, JSON.stringify(graphs, null, 2));
}

function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);

    if (!raw) {
      return {
        showAxisLabels: true,
      };
    }

    const parsed = JSON.parse(raw);

    return {
      showAxisLabels:
        typeof parsed.showAxisLabels === "boolean"
          ? parsed.showAxisLabels
          : true,
    };
  } catch {
    return {
      showAxisLabels: true,
    };
  }
}

function saveAppSettings(settings: AppSettings) {
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings, null, 2));
}

function normalizeMathExpression(raw: string) {
  const trimmed = raw.trim();

  if (trimmed.toLowerCase().startsWith("y=")) {
    return trimmed.slice(2).trim();
  }

  if (trimmed.toLowerCase().startsWith("y =")) {
    return trimmed.slice(3).trim();
  }

  return trimmed;
}

function parseVariableAssignment(rawExpression: string) {
  const match = rawExpression.trim().match(/^([a-zA-Z]\w*)\s*=\s*(.+)$/);

  if (!match) return null;

  const [, name, expression] = match;

  if (!name || !expression) return null;
  if (name === "x" || name === "y") return null;

  return { name, expression };
}

function parseSliderConfig(expression: string) {
  const trimmed = expression.trim();
  const match = trimmed.match(
    /^(.*?)\s*\[\s*(-?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(-?(?:\d+(?:\.\d+)?|\.\d+))(?:\s*,\s*(-?(?:\d+(?:\.\d+)?|\.\d+)))?\s*\]\s*$/,
  );

  const defaultConfig = {
    expression: trimmed,
    min: -10,
    max: 10,
    step: 0.1,
    hasCustomConfig: false,
  };

  if (!match) return defaultConfig;

  const [, rawExpression, rawMin, rawMax, rawStep] = match;

  if (!rawExpression?.trim() || !rawMin || !rawMax) {
    return defaultConfig;
  }

  const min = Number(rawMin);
  const max = Number(rawMax);
  const step = rawStep ? Number(rawStep) : 0.1;

  if (
    !Number.isFinite(min) ||
    !Number.isFinite(max) ||
    !Number.isFinite(step) ||
    min >= max ||
    step <= 0
  ) {
    return defaultConfig;
  }

  return {
    expression: rawExpression.trim(),
    min,
    max,
    step,
    hasCustomConfig: true,
  };
}

function formatSliderConfigNumber(value: number) {
  return Number(value.toFixed(6)).toString();
}

function parseNumericVariableAssignment(rawExpression: string) {
  const assignment = parseVariableAssignment(rawExpression);

  if (!assignment) return null;

  const sliderConfig = parseSliderConfig(assignment.expression);

  try {
    const value = math.evaluate(sliderConfig.expression);

    if (typeof value !== "number" || !Number.isFinite(value)) return null;

    return {
      name: assignment.name,
      value,
      min: sliderConfig.min,
      max: sliderConfig.max,
      step: sliderConfig.step,
      hasCustomConfig: sliderConfig.hasCustomConfig,
    };
  } catch {
    return null;
  }
}

function buildEvaluationScope(expressions: GraphExpression[]) {
  const scope: Record<string, number> = {};

  for (const item of expressions) {
    const assignment = parseVariableAssignment(item.raw);

    if (!assignment) continue;

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

function formatEvaluatedValue(value: unknown) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "undefined";
    return `= ${Number(value.toPrecision(12)).toString()}`;
  }

  if (typeof value?.toString === "function") {
    return `= ${value.toString()}`;
  }

  return "";
}

function isPointExpression(rawExpression: string) {
  return /^\(\s*(.+)\s*,\s*(.+)\s*\)$/.test(rawExpression.trim());
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

function isInequalityExpression(rawExpression: string) {
  return /^(x|y)\s*(>=|<=|>|<)\s*(.+)$/i.test(rawExpression.trim());
}

function isEquationExpression(rawExpression: string) {
  const trimmed = rawExpression.trim();
  const match = trimmed.match(/^(.+?)\s*=\s*(.+)$/);

  if (!match) return false;

  const [, left, right] = match;

  if (!left?.trim() || !right?.trim()) return false;

  const normalizedLeft = left.trim();

  if (
    /^[a-zA-Z]\w*$/.test(normalizedLeft) &&
    normalizedLeft !== "x" &&
    normalizedLeft !== "y"
  ) {
    return false;
  }

  return true;
}

function evaluateMathExpression(raw: string, expressions: GraphExpression[]) {
  const expression = normalizeMathExpression(raw);
  const assignment = parseVariableAssignment(raw);
  const scope = buildEvaluationScope(expressions);

  if (!expression) return "";

  if (
    isPointExpression(raw) ||
    isTableExpression(raw) ||
    isInequalityExpression(raw) ||
    isEquationExpression(raw)
  ) {
    return "";
  }

  try {
    if (assignment) {
      const sliderConfig = parseSliderConfig(assignment.expression);
      const value = math.evaluate(sliderConfig.expression, scope);
      return formatEvaluatedValue(value);
    }

    const compiled = math.compile(expression);
    const usesX = /\bx\b/.test(expression);

    if (usesX) return "";

    const value = compiled.evaluate(scope);
    return formatEvaluatedValue(value);
  } catch {
    return "invalid";
  }
}

function updateVariableAssignment(raw: string, value: number) {
  const assignment = parseVariableAssignment(raw);

  if (!assignment) return raw;

  const sliderConfig = parseSliderConfig(assignment.expression);
  const rounded = Number(value.toFixed(6)).toString();

  if (!sliderConfig.hasCustomConfig) {
    return `${assignment.name} = ${rounded}`;
  }

  return `${assignment.name} = ${rounded} [${formatSliderConfigNumber(
    sliderConfig.min,
  )}, ${formatSliderConfigNumber(sliderConfig.max)}, ${formatSliderConfigNumber(
    sliderConfig.step,
  )}]`;
}

function parseEditableTable(rawExpression: string): EditableTable | null {
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

function editableTableFromTableData(
  tableData: GraphExpression["tableData"],
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

function getEditableTable(expression: GraphExpression) {
  return (
    editableTableFromTableData(expression.tableData) ??
    parseEditableTable(expression.raw)
  );
}

function isEditableTableRowEmpty(row: EditableTableRow) {
  return row.x.trim().length === 0 && row.y.trim().length === 0;
}

function normalizeEditableTableRows(rows: EditableTableRow[]) {
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

function buildTableExpression(
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

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const graphCanvasRef = useRef<GraphCanvasHandle | null>(null);
  const zoomRepeatIntervalRef = useRef<number | null>(null);
  const hasSavedSettingsOnceRef = useRef(false);
  const expressionInputRefs = useRef<
    Record<string, HTMLTextAreaElement | null>
  >({});
  const tableInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const startingExpressions = useMemo(() => createDefaultExpressions(), []);

  const [activeGraphId, setActiveGraphId] = useState<string>(
    crypto.randomUUID(),
  );
  const [title, setTitle] = useState("Untitled Graph");
  const [expressions, setExpressions] =
    useState<GraphExpression[]>(startingExpressions);
  const [nextColorIndex, setNextColorIndex] = useState(
    startingExpressions.length,
  );
  const [library, setLibrary] = useState<SavedGraph[]>(() =>
    loadGraphLibrary(),
  );
  const [saveStatus, setSaveStatus] = useState("Clean graph");
  const [focusedExpressionId, setFocusedExpressionId] = useState<string | null>(
    null,
  );
  const [activeTableCell, setActiveTableCell] = useState<{
    expressionId: string;
    rowIndex: number;
    axis: "x" | "y";
  } | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isViewportDirty, setIsViewportDirty] = useState(false);
  const [showAxisLabels, setShowAxisLabels] = useState(
    () => loadAppSettings().showAxisLabels,
  );
  const [settingsSaveStatus, setSettingsSaveStatus] = useState("");

  function resizeExpressionInput(element: HTMLTextAreaElement | null) {
    if (!element) return;

    const rect = element.getBoundingClientRect();

    if (rect.width < 120) {
      return;
    }

    if (element.value.trim().length === 0) {
      element.style.height = "24px";
      return;
    }

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }

  function focusExpression(id: string) {
    requestAnimationFrame(() => {
      const element = expressionInputRefs.current[id];
      if (!element) return;

      resizeExpressionInput(element);
      element.focus();

      const length = element.value.length;
      element.setSelectionRange(length, length);
    });
  }

  function focusTableCell(id: string, rowIndex: number, axis: "x" | "y") {
    setActiveTableCell({ expressionId: id, rowIndex, axis });

    requestAnimationFrame(() => {
      const element = tableInputRefs.current[`${id}-${rowIndex}-${axis}`];
      if (!element) return;

      element.focus();

      const length = element.value.length;
      element.setSelectionRange(length, length);
    });
  }

  function markUnsaved() {
    setSaveStatus("Unsaved changes");
  }

  function updateExpression(id: string, raw: string) {
    setExpressions((current) =>
      current.map((expression) =>
        expression.id === id ? { ...expression, raw } : expression,
      ),
    );
    markUnsaved();
  }

  function updateExpressionColor(id: string, color: string) {
    setExpressions((current) =>
      current.map((expression) =>
        expression.id === id ? { ...expression, color } : expression,
      ),
    );
    markUnsaved();
  }

  function updateExpressionFromSlider(id: string, value: number) {
    setExpressions((current) =>
      current.map((expression) =>
        expression.id === id
          ? {
              ...expression,
              raw: updateVariableAssignment(expression.raw, value),
            }
          : expression,
      ),
    );
    markUnsaved();
  }

  function updateTableExpression(
    id: string,
    updater: (table: EditableTable) => EditableTable,
    options: { preserveEmptyRows?: boolean } = {},
  ) {
    setExpressions((current) =>
      current.map((expression) => {
        if (expression.id !== id) return expression;

        const table =
          getEditableTable(expression) ??
          ({
            connect: false,
            rows: [{ x: "", y: "" }],
          } satisfies EditableTable);

        const nextTable = updater(table);

        return {
          ...expression,
          raw: buildTableExpression(nextTable, options),
          tableData: createTableDataFromEditableTable(
            nextTable,
            expression.color,
            expression.tableData,
            expression.showPoints !== false,
            options,
          ),
        };
      }),
    );

    markUnsaved();
  }

  function updateTableCell(
    id: string,
    rowIndex: number,
    axis: "x" | "y",
    value: string,
  ) {
    updateTableExpression(id, (table) => ({
      ...table,
      rows: normalizeEditableTableRows(
        table.rows.map((row, index) =>
          index === rowIndex ? { ...row, [axis]: value } : row,
        ),
      ),
    }));
  }

  function addTableRow(id: string, focusAxis?: "x" | "y") {
    const table = expressions
      .map((expression) =>
        expression.id === id ? getEditableTable(expression) : null,
      )
      .find((candidate) => candidate !== null);

    const currentRows =
      table && table.rows.length > 0 ? table.rows : [{ x: "", y: "" }];
    const nextRowIndex = currentRows.length;

    updateTableExpression(
      id,
      (currentTable) => ({
        ...currentTable,
        rows: [
          ...(currentTable.rows.length > 0
            ? currentTable.rows
            : [{ x: "", y: "" }]),
          { x: "", y: "" },
        ],
      }),
      { preserveEmptyRows: true },
    );

    if (focusAxis) {
      focusTableCell(id, nextRowIndex, focusAxis);
    }
  }

  function removeTableRow(id: string, rowIndex: number, focusAxis?: "x" | "y") {
    const table = expressions
      .map((expression) =>
        expression.id === id ? getEditableTable(expression) : null,
      )
      .find((candidate) => candidate !== null);

    const currentRows = table?.rows ?? [{ x: "", y: "" }];

    const nextRows =
      currentRows.length <= 1
        ? [{ x: "", y: "" }]
        : currentRows.filter((_, index) => index !== rowIndex);

    const nextRowIndex =
      nextRows.length <= 1 ? 0 : Math.min(rowIndex, nextRows.length - 1);

    const nextAxis = nextRows.length <= 1 ? "x" : (focusAxis ?? "x");

    updateTableExpression(
      id,
      (currentTable) => ({
        ...currentTable,
        rows:
          currentTable.rows.length <= 1
            ? [{ x: "", y: "" }]
            : currentTable.rows.filter((_, index) => index !== rowIndex),
      }),
      { preserveEmptyRows: true },
    );

    focusTableCell(id, nextRowIndex, nextAxis);
  }

  function handleTableCellKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    id: string,
    rowIndex: number,
    rowCount: number,
    axis: "x" | "y",
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Home" && event.shiftKey && !event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      const end = event.currentTarget.selectionEnd ?? 0;
      event.currentTarget.setSelectionRange(0, end);
      return;
    }

    if (event.key === "End" && event.shiftKey && !event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      const start = event.currentTarget.selectionStart ?? 0;
      event.currentTarget.setSelectionRange(
        start,
        event.currentTarget.value.length,
      );
      return;
    }

    if (event.key === "Home" && event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      focusTableCell(id, 0, "x");
      return;
    }

    if (event.key === "End" && event.ctrlKey) {
      event.preventDefault();
      event.stopPropagation();
      focusTableCell(id, Math.max(0, rowCount - 1), "y");
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();

      if (event.shiftKey) {
        if (axis === "y") {
          focusTableCell(id, rowIndex, "x");
        } else if (rowIndex > 0) {
          focusTableCell(id, rowIndex - 1, "y");
        }

        return;
      }

      if (axis === "x") {
        focusTableCell(id, rowIndex, "y");
      } else if (rowIndex === rowCount - 1) {
        addTableRow(id, "x");
      } else {
        focusTableCell(id, rowIndex + 1, "x");
      }

      return;
    }

    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();

      if (rowIndex > 0) {
        focusTableCell(id, rowIndex - 1, axis);
      }

      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();

      if (rowIndex === rowCount - 1) {
        addTableRow(id, axis);
      } else {
        focusTableCell(id, rowIndex + 1, axis);
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();

      if (rowIndex === rowCount - 1) {
        addTableRow(id, axis);
      } else {
        focusTableCell(id, rowIndex + 1, axis);
      }

      return;
    }

    if (event.key === "ArrowUp" && rowIndex > 0) {
      event.preventDefault();
      event.stopPropagation();
      focusTableCell(id, rowIndex - 1, axis);
      return;
    }

    if (
      event.key === "ArrowRight" &&
      axis === "x" &&
      event.currentTarget.selectionStart === event.currentTarget.value.length &&
      event.currentTarget.selectionEnd === event.currentTarget.value.length
    ) {
      event.preventDefault();
      event.stopPropagation();
      focusTableCell(id, rowIndex, "y");
      return;
    }

    if (
      event.key === "ArrowLeft" &&
      axis === "y" &&
      event.currentTarget.selectionStart === 0 &&
      event.currentTarget.selectionEnd === 0
    ) {
      event.preventDefault();
      event.stopPropagation();
      focusTableCell(id, rowIndex, "x");
      return;
    }

    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      event.currentTarget.value.length === 0
    ) {
      const table = expressions
        .map((expression) =>
          expression.id === id ? getEditableTable(expression) : null,
        )
        .find((candidate) => candidate !== null);

      const row = table?.rows[rowIndex];
      const isRowEmpty = row ? isEditableTableRowEmpty(row) : true;

      if (!isRowEmpty) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      removeTableRow(id, rowIndex, axis);
    }
  }

  function handleTablePaste(
    event: React.ClipboardEvent<HTMLInputElement>,
    id: string,
    startRowIndex: number,
    startAxis: "x" | "y",
  ) {
    const pastedText = event.clipboardData.getData("text");

    if (!pastedText.includes("\n") && !pastedText.includes("\t")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const pastedRows = pastedText
      .trim()
      .split(/\r?\n/)
      .map((line) => {
        const trimmedLine = line.trim();

        if (trimmedLine.includes("\t") || trimmedLine.includes(",")) {
          return trimmedLine.split(/\t|,/).map((cell) => cell.trim());
        }

        return trimmedLine.split(/\s+/);
      })
      .filter((row) => row.some((cell) => cell.length > 0));

    if (pastedRows.length === 0) return;

    updateTableExpression(id, (table) => {
      const rows = table.rows.map((row) => ({ ...row }));

      while (rows.length < startRowIndex + pastedRows.length) {
        rows.push({ x: "", y: "" });
      }

      pastedRows.forEach((pastedRow, pastedRowIndex) => {
        const targetRowIndex = startRowIndex + pastedRowIndex;
        const targetRow = rows[targetRowIndex];

        if (!targetRow) return;

        if (startAxis === "x") {
          targetRow.x = pastedRow[0] ?? "";
          targetRow.y = pastedRow[1] ?? targetRow.y;
        } else {
          targetRow.y = pastedRow[0] ?? "";
        }
      });

      return {
        ...table,
        rows: normalizeEditableTableRows(rows),
      };
    });

    const lastRowIndex = startRowIndex + pastedRows.length - 1;
    const lastRow = pastedRows[pastedRows.length - 1] ?? [];
    const focusAxis = startAxis === "x" && lastRow.length > 1 ? "y" : startAxis;

    focusTableCell(id, lastRowIndex, focusAxis);
  }

  function toggleTableLines(id: string) {
    updateTableExpression(id, (table) => ({
      ...table,
      connect: !table.connect,
    }));
  }

  function toggleExpression(id: string) {
    setExpressions((current) =>
      current.map((expression) =>
        expression.id === id
          ? { ...expression, visible: !expression.visible }
          : expression,
      ),
    );
    markUnsaved();
  }

  function toggleTablePoints(id: string) {
    setExpressions((current) =>
      current.map((expression) => {
        if (expression.id !== id) return expression;

        const showPoints = expression.showPoints === false;

        return {
          ...expression,
          showPoints,
          tableData: expression.tableData
            ? {
                ...expression.tableData,
                showPoints,
              }
            : expression.tableData,
        };
      }),
    );
    markUnsaved();
  }

  function togglePointLabel(id: string) {
    setExpressions((current) =>
      current.map((expression) =>
        expression.id === id && isPointExpression(expression.raw)
          ? { ...expression, showLabel: !expression.showLabel }
          : expression,
      ),
    );

    markUnsaved();
  }

  function addExpression() {
    const expression = createEmptyExpression(nextColorIndex);

    setExpressions((current) => [...current, expression]);
    setNextColorIndex((current) => current + 1);
    setFocusedExpressionId(expression.id);
    focusExpression(expression.id);
    markUnsaved();
  }

  function addExpressionFromMenu() {
    setIsCreateMenuOpen(false);
    addExpression();
  }

  function addTableExpression() {
    const baseExpression = createEmptyExpression(nextColorIndex);
    const table = {
      connect: false,
      rows: [{ x: "", y: "" }],
    } satisfies EditableTable;

    const expression = {
      ...baseExpression,
      raw: buildTableExpression(table),
      tableData: createTableDataFromEditableTable(table, baseExpression.color),
    };

    setExpressions((current) => [...current, expression]);
    setNextColorIndex((current) => current + 1);
    setFocusedExpressionId(expression.id);
    setIsCreateMenuOpen(false);

    focusTableCell(expression.id, 0, "x");

    markUnsaved();
  }

  function addExpressionFromKeyboard() {
    if (focusedExpressionId) {
      addExpressionAfter(focusedExpressionId);
      return;
    }

    addExpression();
  }

  function addExpressionAfter(id: string) {
    const expression = createEmptyExpression(nextColorIndex);

    setExpressions((current) => {
      const index = current.findIndex((item) => item.id === id);

      if (index === -1) {
        return [...current, expression];
      }

      return [
        ...current.slice(0, index + 1),
        expression,
        ...current.slice(index + 1),
      ];
    });

    setNextColorIndex((current) => current + 1);
    setFocusedExpressionId(expression.id);
    focusExpression(expression.id);
    markUnsaved();
  }

  function duplicateExpression(id: string) {
    const index = expressions.findIndex((expression) => expression.id === id);

    if (index === -1) {
      return;
    }

    const sourceExpression = expressions[index];
    const color = generateExpressionColor(nextColorIndex);
    const duplicatedExpression: GraphExpression = {
      ...sourceExpression,
      id: crypto.randomUUID(),
      color,
      tableData: sourceExpression.tableData
        ? {
            ...sourceExpression.tableData,
            columns: sourceExpression.tableData.columns.map((column) => ({
              ...column,
              color,
            })),
            rows: sourceExpression.tableData.rows.map((row) => ({
              ...row,
              id: crypto.randomUUID(),
              cells: { ...row.cells },
            })),
          }
        : undefined,
    };

    setExpressions((current) => {
      const currentIndex = current.findIndex(
        (expression) => expression.id === id,
      );

      if (currentIndex === -1) {
        return current;
      }

      return [
        ...current.slice(0, currentIndex + 1),
        duplicatedExpression,
        ...current.slice(currentIndex + 1),
      ];
    });

    setNextColorIndex((current) => current + 1);
    setFocusedExpressionId(duplicatedExpression.id);

    if (duplicatedExpression.tableData) {
      focusTableCell(duplicatedExpression.id, 0, "x");
    } else {
      focusExpression(duplicatedExpression.id);
    }

    markUnsaved();
  }

  function removeExpression(id: string) {
    const index = expressions.findIndex((expression) => expression.id === id);

    if (index === -1) {
      return;
    }

    if (expressions.length <= 1) {
      setExpressions((current) =>
        current.map((expression) =>
          expression.id === id
            ? {
                ...expression,
                raw: "",
                tableData: undefined,
                showLabel: false,
              }
            : expression,
        ),
      );
      setFocusedExpressionId(id);
      focusExpression(id);
      markUnsaved();
      return;
    }

    const nextExpressions = expressions.filter(
      (expression) => expression.id !== id,
    );

    const nextFocusedExpression =
      nextExpressions[index] ?? nextExpressions[index - 1] ?? null;

    setExpressions(nextExpressions);
    setFocusedExpressionId(nextFocusedExpression?.id ?? null);

    requestAnimationFrame(() => {
      if (nextFocusedExpression) {
        focusExpression(nextFocusedExpression.id);
      }
    });

    markUnsaved();
  }

  function handleExpressionKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    id: string,
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      addExpressionAfter(id);
      return;
    }

    if (
      event.key === "Backspace" &&
      event.currentTarget.value === "" &&
      event.currentTarget.selectionStart === 0 &&
      event.currentTarget.selectionEnd === 0
    ) {
      event.preventDefault();
      event.stopPropagation();
      removeExpression(id);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.blur();
    }
  }

  function createGraphSnapshot(): SavedGraph {
    return {
      id: activeGraphId,
      version: 1,
      title,
      expressions: expressions.map(normalizeExpression),
      updatedAt: new Date().toISOString(),
    };
  }

  function saveGraph() {
    const graph = createGraphSnapshot();

    setLibrary((current) => {
      const withoutCurrent = current.filter((item) => item.id !== graph.id);
      const next = [graph, ...withoutCurrent];
      saveGraphLibrary(next);
      return next;
    });

    setSaveStatus(
      `Saved to library ${new Date(graph.updatedAt).toLocaleTimeString()}`,
    );
  }

  function loadGraph(graph: SavedGraph) {
    const normalized = normalizeGraph(graph);

    setActiveGraphId(normalized.id);
    setTitle(normalized.title);
    setExpressions(normalized.expressions);
    setNextColorIndex(normalized.expressions.length);
    setFocusedExpressionId(null);

    setSaveStatus(`Loaded ${new Date(normalized.updatedAt).toLocaleString()}`);
  }

  function newGraph() {
    const defaultExpressions = createDefaultExpressions();
    const firstExpression = defaultExpressions[0];

    setActiveGraphId(crypto.randomUUID());
    setTitle("Untitled Graph");
    setExpressions(defaultExpressions);
    setNextColorIndex(defaultExpressions.length);
    setSaveStatus("Clean graph");

    if (firstExpression) {
      focusExpression(firstExpression.id);
    }
  }

  function deleteGraph(id: string) {
    setLibrary((current) => {
      const next = current.filter((graph) => graph.id !== id);
      saveGraphLibrary(next);
      return next;
    });

    if (id === activeGraphId) {
      newGraph();
    }
  }

  function resetGraph() {
    const defaultExpressions = createDefaultExpressions();
    const firstExpression = defaultExpressions[0];

    setTitle("Untitled Graph");
    setExpressions(defaultExpressions);
    setNextColorIndex(defaultExpressions.length);
    markUnsaved();

    if (firstExpression) {
      focusExpression(firstExpression.id);
    }
  }

  function exportJson() {
    const graph = createGraphSnapshot();
    const json = JSON.stringify(graph, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const safeTitle = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeTitle || "axiom-graph"}.json`;
    link.click();

    URL.revokeObjectURL(url);
    setSaveStatus("Exported JSON");
  }

  function openImportDialog() {
    fileInputRef.current?.click();
  }

  function exportPng() {
    graphCanvasRef.current?.exportPng();
    setSaveStatus("Exported PNG");
  }

  function resetView() {
    graphCanvasRef.current?.resetView();
    setIsViewportDirty(false);
  }

  function zoomIn() {
    graphCanvasRef.current?.zoomIn();
  }

  function zoomOut() {
    graphCanvasRef.current?.zoomOut();
  }

  function stopContinuousZoom() {
    if (zoomRepeatIntervalRef.current !== null) {
      window.clearInterval(zoomRepeatIntervalRef.current);
      zoomRepeatIntervalRef.current = null;
    }
  }

  function startContinuousZoom(direction: "in" | "out") {
    stopContinuousZoom();

    if (direction === "in") {
      zoomIn();
    } else {
      zoomOut();
    }

    zoomRepeatIntervalRef.current = window.setInterval(() => {
      if (direction === "in") {
        zoomIn();
      } else {
        zoomOut();
      }
    }, 80);
  }

  function isEditableShortcutTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest("input, textarea, select, button") ||
      target.isContentEditable,
    );
  }

  function isExpressionListShortcutTarget(target: EventTarget | null) {
    return target instanceof HTMLElement
      ? Boolean(target.closest(".expression-list"))
      : false;
  }

  async function importJson(file: File | undefined) {
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!isValidSavedGraph(parsed)) {
        setSaveStatus("Invalid JSON graph file");
        return;
      }

      const imported = normalizeGraph({
        ...parsed,
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
      });

      setActiveGraphId(imported.id);
      setTitle(imported.title);
      setExpressions(imported.expressions);
      setNextColorIndex(imported.expressions.length);
      setFocusedExpressionId(null);
      setSaveStatus("Imported JSON");
    } catch {
      setSaveStatus("Invalid JSON graph file");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isModifierPressed = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (isModifierPressed && key === "s") {
        event.preventDefault();
        saveGraph();
      }

      if (isModifierPressed && key === "r") {
        event.preventDefault();
        resetGraph();
      }

      if (isModifierPressed && key === "w") {
        if (!isExpressionListShortcutTarget(event.target)) {
          return;
        }

        event.preventDefault();

        if (focusedExpressionId) {
          removeExpression(focusedExpressionId);
        }
      }

      if (isModifierPressed && key === "d") {
        if (!isExpressionListShortcutTarget(event.target)) {
          return;
        }

        event.preventDefault();

        if (focusedExpressionId) {
          duplicateExpression(focusedExpressionId);
        }
      }

      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isSettingsOpen
      ) {
        if (isEditableShortcutTarget(event.target)) {
          return;
        }

        event.preventDefault();
        addExpressionFromKeyboard();
      }

      if (event.key === "Escape" && isCreateMenuOpen) {
        setIsCreateMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    activeGraphId,
    title,
    expressions,
    nextColorIndex,
    focusedExpressionId,
    isSettingsOpen,
    isCreateMenuOpen,
  ]);

  useEffect(() => {
    if (isSidebarCollapsed) return;

    requestAnimationFrame(() => {
      for (const expression of expressions) {
        resizeExpressionInput(
          expressionInputRefs.current[expression.id] ?? null,
        );
      }
    });
  }, [expressions, isSidebarCollapsed]);

  useEffect(() => {
    if (!hasSavedSettingsOnceRef.current) {
      hasSavedSettingsOnceRef.current = true;
      return;
    }

    saveAppSettings({
      showAxisLabels,
    });

    setSettingsSaveStatus("saved");

    const timeout = window.setTimeout(() => {
      setSettingsSaveStatus("");
    }, 1400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [showAxisLabels]);

  useEffect(() => {
    if (!isCreateMenuOpen) return;

    function closeCreateMenu() {
      setIsCreateMenuOpen(false);
    }

    window.addEventListener("pointerdown", closeCreateMenu);

    return () => {
      window.removeEventListener("pointerdown", closeCreateMenu);
    };
  }, [isCreateMenuOpen]);

  useEffect(() => {
    if (!isSettingsOpen) return;

    function handleSettingsEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    }

    window.addEventListener("keydown", handleSettingsEscape);

    return () => {
      window.removeEventListener("keydown", handleSettingsEscape);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    function resetPageZoom() {
      document.body.style.setProperty("zoom", "1");
      document.documentElement.style.setProperty("zoom", "1");
    }

    resetPageZoom();

    const interval = window.setInterval(resetPageZoom, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopContinuousZoom();
    };
  }, []);

  return (
    <main
      className={`app ${isSidebarCollapsed ? "app-sidebar-collapsed" : ""}`}
    >
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>Axiom</h1>
            <p>Local graphing calculator</p>
          </div>
        </div>

        <section className="panel">
          <div className="expression-create-toolbar">
            <button
              className="add-expression-button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                setIsCreateMenuOpen((current) => !current);
              }}
              title="Add item"
              aria-label="Add item"
            >
              <svg className="icon-fill" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
              </svg>
            </button>

            {isCreateMenuOpen ? (
              <div
                className="create-menu"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button onClick={addExpressionFromMenu}>
                  <span>Expression</span>
                </button>
                <button onClick={addTableExpression}>
                  <span>Table</span>
                </button>
              </div>
            ) : null}
            <button
              className="sidebar-collapse-glyph inline-collapse-glyph"
              onClick={() => setIsSidebarCollapsed(true)}
              title="Hide sidebar"
              aria-label="Hide sidebar"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m11 17-5-5 5-5" />
                <path d="m18 17-5-5 5-5" />
              </svg>
            </button>
          </div>

          {expressions.length === 0 ? null : (
            <div className="expression-list">
              {expressions.map((expression) => {
                const result = evaluateMathExpression(
                  expression.raw,
                  expressions,
                );
                const slider = parseNumericVariableAssignment(expression.raw);
                const table = getEditableTable(expression);
                const pointExpression = isPointExpression(expression.raw);

                return (
                  <div
                    className={`expression-card ${
                      expression.visible ? "" : "expression-card-hidden"
                    } ${
                      focusedExpressionId === expression.id
                        ? "expression-card-focused"
                        : ""
                    } ${table ? "expression-card-table" : ""}`}
                    key={expression.id}
                    onPointerDown={(event) => {
                      if (table) return;

                      const target = event.target as HTMLElement;
                      const isInteractiveTarget = target.closest(
                        "button, input, textarea, select",
                      );

                      if (isInteractiveTarget) return;

                      event.preventDefault();
                      focusExpression(expression.id);
                    }}
                  >
                    <div className="expression-left-tools">
                      <button
                        className="visibility-button"
                        onClick={() => toggleExpression(expression.id)}
                        title={
                          expression.visible
                            ? "Hide expression"
                            : "Show expression"
                        }
                        style={{ borderColor: expression.color }}
                      >
                        <span
                          className="visibility-dot"
                          style={{
                            background: expression.visible
                              ? expression.color
                              : "transparent",
                          }}
                        />
                      </button>

                      {table ? (
                        <button
                          className={`table-toggle table-toggle-icon ${
                            table.connect ? "table-toggle-active" : ""
                          }`}
                          onClick={() => toggleTableLines(expression.id)}
                          title="Connect table points"
                          aria-label="Connect table points"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M18 5C17.4477 5 17 5.44772 17 6C17 6.27642 17.1108 6.52505 17.2929 6.70711C17.475 6.88917 17.7236 7 18 7C18.5523 7 19 6.55228 19 6C19 5.44772 18.5523 5 18 5ZM15 6C15 4.34315 16.3431 3 18 3C19.6569 3 21 4.34315 21 6C21 7.65685 19.6569 9 18 9C17.5372 9 17.0984 8.8948 16.7068 8.70744L8.70744 16.7068C8.8948 17.0984 9 17.5372 9 18C9 19.6569 7.65685 21 6 21C4.34315 21 3 19.6569 3 18C3 16.3431 4.34315 15 6 15C6.46278 15 6.90157 15.1052 7.29323 15.2926L15.2926 7.29323C15.1052 6.90157 15 6.46278 15 6ZM6 17C5.44772 17 5 17.4477 5 18C5 18.5523 5.44772 19 6 19C6.55228 19 7 18.5523 7 18C7 17.7236 6.88917 17.475 6.70711 17.2929C6.52505 17.1108 6.27642 17 6 17Z"
                            />
                          </svg>
                        </button>
                      ) : null}

                      {table ? (
                        <button
                          className={`table-toggle table-toggle-icon ${
                            expression.showPoints === false
                              ? ""
                              : "table-toggle-active"
                          }`}
                          onClick={() => toggleTablePoints(expression.id)}
                          title={
                            expression.showPoints === false
                              ? "Show table points"
                              : "Hide table points"
                          }
                          aria-label={
                            expression.showPoints === false
                              ? "Show table points"
                              : "Hide table points"
                          }
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="5" />
                          </svg>
                        </button>
                      ) : null}
                    </div>

                    <div className="expression-input-stack">
                      {table ? (
                        <div className="table-editor">
                          <div className="table-grid">
                            <div className="table-heading">x</div>
                            <div className="table-heading">y</div>

                            {table.rows.map((row, rowIndex) => (
                              <div className="table-row" key={rowIndex}>
                                <input
                                  ref={(element) => {
                                    tableInputRefs.current[
                                      `${expression.id}-${rowIndex}-x`
                                    ] = element;
                                  }}
                                  className={
                                    activeTableCell?.expressionId ===
                                      expression.id &&
                                    activeTableCell.rowIndex === rowIndex &&
                                    activeTableCell.axis === "x"
                                      ? "table-cell-active"
                                      : undefined
                                  }
                                  value={row.x}
                                  onFocus={() => {
                                    setFocusedExpressionId(expression.id);
                                    setActiveTableCell({
                                      expressionId: expression.id,
                                      rowIndex,
                                      axis: "x",
                                    });
                                  }}
                                  onBlur={() => {
                                    setActiveTableCell(null);
                                    setFocusedExpressionId((current) =>
                                      current === expression.id
                                        ? null
                                        : current,
                                    );
                                  }}
                                  onChange={(event) =>
                                    updateTableCell(
                                      expression.id,
                                      rowIndex,
                                      "x",
                                      event.target.value,
                                    )
                                  }
                                  onKeyDown={(event) =>
                                    handleTableCellKeyDown(
                                      event,
                                      expression.id,
                                      rowIndex,
                                      table.rows.length,
                                      "x",
                                    )
                                  }
                                  onPaste={(event) =>
                                    handleTablePaste(
                                      event,
                                      expression.id,
                                      rowIndex,
                                      "x",
                                    )
                                  }
                                  placeholder="x"
                                  spellCheck={false}
                                />
                                <input
                                  ref={(element) => {
                                    tableInputRefs.current[
                                      `${expression.id}-${rowIndex}-y`
                                    ] = element;
                                  }}
                                  className={
                                    activeTableCell?.expressionId ===
                                      expression.id &&
                                    activeTableCell.rowIndex === rowIndex &&
                                    activeTableCell.axis === "y"
                                      ? "table-cell-active"
                                      : undefined
                                  }
                                  value={row.y}
                                  onFocus={() => {
                                    setFocusedExpressionId(expression.id);
                                    setActiveTableCell({
                                      expressionId: expression.id,
                                      rowIndex,
                                      axis: "y",
                                    });
                                  }}
                                  onBlur={() => {
                                    setActiveTableCell(null);
                                    setFocusedExpressionId((current) =>
                                      current === expression.id
                                        ? null
                                        : current,
                                    );
                                  }}
                                  onChange={(event) =>
                                    updateTableCell(
                                      expression.id,
                                      rowIndex,
                                      "y",
                                      event.target.value,
                                    )
                                  }
                                  onKeyDown={(event) =>
                                    handleTableCellKeyDown(
                                      event,
                                      expression.id,
                                      rowIndex,
                                      table.rows.length,
                                      "y",
                                    )
                                  }
                                  onPaste={(event) =>
                                    handleTablePaste(
                                      event,
                                      expression.id,
                                      rowIndex,
                                      "y",
                                    )
                                  }
                                  placeholder="y"
                                  spellCheck={false}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          <textarea
                            ref={(element) => {
                              expressionInputRefs.current[expression.id] =
                                element;
                              resizeExpressionInput(element);
                            }}
                            className="expression-textarea"
                            rows={1}
                            value={expression.raw}
                            onFocus={() =>
                              setFocusedExpressionId(expression.id)
                            }
                            onBlur={() => {
                              setFocusedExpressionId((current) =>
                                current === expression.id ? null : current,
                              );
                            }}
                            onChange={(event) =>
                              updateExpression(
                                expression.id,
                                event.target.value,
                              )
                            }
                            onInput={(event) =>
                              resizeExpressionInput(
                                event.currentTarget as HTMLTextAreaElement,
                              )
                            }
                            onKeyDown={(event) =>
                              handleExpressionKeyDown(event, expression.id)
                            }
                            placeholder="Type an expression..."
                            spellCheck={false}
                          />

                          {result ? (
                            <span className="expression-result">{result}</span>
                          ) : null}

                          {pointExpression ? (
                            <button
                              className={`point-label-control ${
                                expression.showLabel
                                  ? "point-label-control-active"
                                  : ""
                              }`}
                              onClick={() => togglePointLabel(expression.id)}
                              type="button"
                            >
                              {expression.showLabel ? (
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344" />
                                  <path d="m9 11 3 3L22 4" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                  <rect
                                    width="18"
                                    height="18"
                                    x="3"
                                    y="3"
                                    rx="2"
                                  />
                                </svg>
                              )}
                              <span>Label</span>
                            </button>
                          ) : null}

                          {slider ? (
                            <div className="slider-control">
                              <span className="slider-label">
                                {formatSliderConfigNumber(slider.min)}
                              </span>
                              <input
                                type="range"
                                min={slider.min}
                                max={slider.max}
                                step={slider.step}
                                value={Math.max(
                                  slider.min,
                                  Math.min(slider.max, slider.value),
                                )}
                                style={{ accentColor: expression.color }}
                                onChange={(event) =>
                                  updateExpressionFromSlider(
                                    expression.id,
                                    Number(event.target.value),
                                  )
                                }
                              />
                              <span className="slider-label">
                                {formatSliderConfigNumber(slider.max)}
                              </span>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>

                    <div className="expression-right-tools">
                      <label
                        className="color-picker-label"
                        title="Change line color"
                        style={{ background: expression.color }}
                      >
                        <input
                          className="color-picker"
                          type="color"
                          value={expression.color}
                          onChange={(event) =>
                            updateExpressionColor(
                              expression.id,
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <button
                        className="remove-button"
                        onClick={() => duplicateExpression(expression.id)}
                        title="Duplicate expression"
                        aria-label="Duplicate expression"
                        type="button"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect
                            width="14"
                            height="14"
                            x="8"
                            y="8"
                            rx="2"
                            ry="2"
                          />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </button>

                      <button
                        className="remove-button"
                        onClick={() => removeExpression(expression.id)}
                        title="Remove expression"
                        aria-label="Remove expression"
                        type="button"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel library-panel">
          <div className="panel-header">
            <h2>Library</h2>
          </div>

          {library.length === 0 ? (
            <p className="empty-library">No saved graphs yet.</p>
          ) : (
            <div className="library-list">
              {library.map((graph) => (
                <div
                  className={`library-item ${
                    graph.id === activeGraphId ? "library-item-active" : ""
                  }`}
                  key={graph.id}
                >
                  <button
                    className="library-load-button"
                    onClick={() => loadGraph(graph)}
                  >
                    <span>{graph.title || "Untitled Graph"}</span>
                    <small>{new Date(graph.updatedAt).toLocaleString()}</small>
                  </button>

                  <button
                    className="remove-button"
                    onClick={() => deleteGraph(graph.id)}
                    title="Delete saved graph"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>

      <section className="graph-area">
        <div className="topbar">
          <input
            className="title-input"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              markUnsaved();
            }}
            spellCheck={false}
          />

          <div className="topbar-actions">
            <span className="save-status">{saveStatus}</span>
            <button
              onClick={openImportDialog}
              title="Import JSON"
              aria-label="Import JSON"
            >
              <svg className="icon-fill" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
                <path d="M11.78 4.72a.749.749 0 1 1-1.06 1.06L8.75 3.811V9.5a.75.75 0 0 1-1.5 0V3.811L5.28 5.78a.749.749 0 1 1-1.06-1.06l3.25-3.25a.749.749 0 0 1 1.06 0l3.25 3.25Z" />
              </svg>
            </button>
            <button
              onClick={exportJson}
              title="Export JSON"
              aria-label="Export JSON"
            >
              <svg className="icon-fill" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
                <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z" />
              </svg>
            </button>
            <button
              onClick={exportPng}
              title="Export PNG"
              aria-label="Export PNG"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21" />
                <path d="m14 19.5 3-3 3 3" />
                <path d="M17 22v-5.5" />
                <circle cx="9" cy="9" r="2" />
              </svg>
            </button>
            <button
              onClick={resetGraph}
              title="Reset graph"
              aria-label="Reset graph"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
            <button
              onClick={saveGraph}
              title="Save graph"
              aria-label="Save graph"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                <path d="M7 3v4a1 1 0 0 0 1 1h7" />
              </svg>
            </button>
            <button
              onClick={() => setIsSettingsOpen((current) => !current)}
              title="Open settings"
              aria-label="Open settings"
              aria-expanded={isSettingsOpen}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </button>
          </div>

          <input
            ref={fileInputRef}
            className="hidden-file-input"
            type="file"
            accept="application/json,.json"
            onChange={(event) => importJson(event.target.files?.[0])}
          />
        </div>

        {isSidebarCollapsed ? (
          <button
            className="sidebar-open-glyph"
            onClick={() => setIsSidebarCollapsed(false)}
            title="Show sidebar"
            aria-label="Show sidebar"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 17 5-5-5-5" />
              <path d="m13 17 5-5-5-5" />
            </svg>
          </button>
        ) : null}

        {isSettingsOpen ? (
          <div
            className="settings-popover"
            role="dialog"
            aria-labelledby="settings-title"
          >
            <div className="settings-header">
              <div>
                <div className="settings-title-row">
                  <h2 id="settings-title">Settings</h2>
                  {settingsSaveStatus ? (
                    <span className="settings-save-badge">
                      {settingsSaveStatus}
                    </span>
                  ) : null}
                </div>
                <p>Early controls for graph behavior.</p>
              </div>

              <button
                className="settings-close-button"
                onClick={() => setIsSettingsOpen(false)}
                title="Close settings"
                aria-label="Close settings"
              >
                <svg
                  className="icon-fill"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="M2.344 2.343h-.001a8 8 0 0 1 11.314 11.314A8.002 8.002 0 0 1 .234 10.089a8 8 0 0 1 2.11-7.746Zm1.06 10.253a6.5 6.5 0 1 0 9.108-9.275 6.5 6.5 0 0 0-9.108 9.275ZM6.03 4.97 8 6.94l1.97-1.97a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l1.97 1.97a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-1.97 1.97a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L6.94 8 4.97 6.03a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018Z" />
                </svg>
              </button>
            </div>

            <section className="settings-section">
              <h3>Appearance</h3>

              <div className="settings-row">
                <div>
                  <span>Theme</span>
                  <small>Dark only for now.</small>
                </div>
                <button
                  className="setting-switch setting-switch-active"
                  type="button"
                  aria-pressed="true"
                  disabled
                >
                  <span />
                </button>
              </div>
            </section>

            <section className="settings-section">
              <h3>Graph labels</h3>

              <div className="settings-row">
                <div>
                  <span>Show axis labels</span>
                  <small>Show or hide the numbers on the graph axes.</small>
                </div>
                <button
                  className={`setting-switch ${
                    showAxisLabels ? "setting-switch-active" : ""
                  }`}
                  type="button"
                  aria-pressed={showAxisLabels}
                  onClick={() => setShowAxisLabels((current) => !current)}
                >
                  <span />
                </button>
              </div>
            </section>

            <section className="settings-section">
              <h3>Sliders</h3>

              <div className="settings-row">
                <div>
                  <span>Custom step controls</span>
                  <small>Currently handled through text syntax.</small>
                </div>
                <button
                  className="setting-switch"
                  type="button"
                  aria-pressed="false"
                  disabled
                >
                  <span />
                </button>
              </div>
            </section>
          </div>
        ) : null}

        <div className="graph-stage">
          <GraphCanvas
            ref={graphCanvasRef}
            expressions={expressions}
            showAxisLabels={showAxisLabels}
            onViewportDirtyChange={setIsViewportDirty}
          />

          <div className="graph-floating-controls">
            <button
              onPointerDown={(event) => {
                event.preventDefault();
                startContinuousZoom("in");
              }}
              onPointerUp={stopContinuousZoom}
              onPointerLeave={stopContinuousZoom}
              onPointerCancel={stopContinuousZoom}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  zoomIn();
                }
              }}
              title="Zoom in"
              aria-label="Zoom in"
            >
              +
            </button>

            <button
              onPointerDown={(event) => {
                event.preventDefault();
                startContinuousZoom("out");
              }}
              onPointerUp={stopContinuousZoom}
              onPointerLeave={stopContinuousZoom}
              onPointerCancel={stopContinuousZoom}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  zoomOut();
                }
              }}
              title="Zoom out"
              aria-label="Zoom out"
            >
              −
            </button>

            {isViewportDirty ? (
              <button
                onClick={resetView}
                title="Reset view"
                aria-label="Reset view"
              >
                ↺
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
