import { useEffect, useMemo, useRef, useState } from "react";
import { all, create } from "mathjs";
import GraphCanvas, {
  type GraphCanvasHandle,
  type GraphExpression,
} from "./components/GraphCanvas";
import "./App.css";

const math = create(all, {});

const GRAPH_LIBRARY_KEY = "axiom.graphLibrary";

type SavedGraph = {
  id: string;
  version: number;
  title: string;
  expressions: GraphExpression[];
  updatedAt: string;
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
    typeof expression.visible === "boolean"
  );
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
    expressions: value.expressions,
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

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const graphCanvasRef = useRef<GraphCanvasHandle | null>(null);
  const zoomRepeatIntervalRef = useRef<number | null>(null);
  const expressionInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>(
    {},
  );

  const startingExpressions = useMemo(() => createDefaultExpressions(), []);

  const [activeGraphId, setActiveGraphId] = useState<string>(crypto.randomUUID());
  const [title, setTitle] = useState("Untitled Graph");
  const [expressions, setExpressions] =
    useState<GraphExpression[]>(startingExpressions);
  const [nextColorIndex, setNextColorIndex] = useState(
    startingExpressions.length,
  );
  const [library, setLibrary] = useState<SavedGraph[]>(() => loadGraphLibrary());
  const [saveStatus, setSaveStatus] = useState("Clean graph");
  const [focusedExpressionId, setFocusedExpressionId] = useState<string | null>(
    null,
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
          ? { ...expression, raw: updateVariableAssignment(expression.raw, value) }
          : expression,
      ),
    );
    markUnsaved();
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

  function addExpression() {
    const expression = createEmptyExpression(nextColorIndex);

    setExpressions((current) => [...current, expression]);
    setNextColorIndex((current) => current + 1);
    focusExpression(expression.id);
    markUnsaved();
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
    focusExpression(expression.id);
    markUnsaved();
  }

  function removeExpression(id: string) {
    const index = expressions.findIndex((expression) => expression.id === id);
    const nextExpressions = expressions.filter(
      (expression) => expression.id !== id,
    );

    const nextFocusedExpression =
      nextExpressions[Math.min(index, nextExpressions.length - 1)] ?? null;

    setExpressions(nextExpressions);
    setFocusedExpressionId(nextFocusedExpression?.id ?? null);

    requestAnimationFrame(() => {
      if (nextFocusedExpression) {
        focusExpression(nextFocusedExpression.id);
      }
    });

    markUnsaved();
  }

  function createGraphSnapshot(): SavedGraph {
    return {
      id: activeGraphId,
      version: 1,
      title,
      expressions,
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
        event.preventDefault();

        if (focusedExpressionId) {
          removeExpression(focusedExpressionId);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeGraphId, title, expressions, nextColorIndex, focusedExpressionId]);

  useEffect(() => {
    if (isSidebarCollapsed) return;

    requestAnimationFrame(() => {
      for (const expression of expressions) {
        resizeExpressionInput(expressionInputRefs.current[expression.id] ?? null);
      }
    });
  }, [expressions, isSidebarCollapsed]);

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
    <main className={`app ${isSidebarCollapsed ? "app-sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>Axiom</h1>
            <p>Local graphing calculator</p>
          </div>
        </div>

        <button
          className="sidebar-collapse-glyph"
          onClick={() => setIsSidebarCollapsed(true)}
          title="Hide sidebar"
          aria-label="Hide sidebar"
        >
          «
        </button>

        <section className="panel">
          <div className="panel-header">
            <h2>Expressions</h2>
            <button className="add-expression-button" onClick={addExpression}>
              +
            </button>
          </div>

          {expressions.length === 0 ? (
            <p className="empty-library">No expressions. Click + to add one.</p>
          ) : (
            <div className="expression-list">
              {expressions.map((expression) => {
                const result = evaluateMathExpression(expression.raw, expressions);
                const slider = parseNumericVariableAssignment(expression.raw);

                return (
                  <div
                    className={`expression-card ${
                      expression.visible ? "" : "expression-card-hidden"
                    }`}
                    key={expression.id}
                  >
                    <button
                      className="visibility-button"
                      onClick={() => toggleExpression(expression.id)}
                      title={
                        expression.visible ? "Hide expression" : "Show expression"
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

                    <div className="expression-input-stack">
                      <textarea
                        ref={(element) => {
                          expressionInputRefs.current[expression.id] = element;
                          resizeExpressionInput(element);
                        }}
                        className="expression-textarea"
                        rows={1}
                        value={expression.raw}
                        onFocus={() => setFocusedExpressionId(expression.id)}
                        onChange={(event) =>
                          updateExpression(expression.id, event.target.value)
                        }
                        onInput={(event) =>
                          resizeExpressionInput(
                            event.currentTarget as HTMLTextAreaElement,
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            addExpressionAfter(expression.id);
                          }
                        }}
                        placeholder="Type an expression..."
                        spellCheck={false}
                      />

                      {result ? (
                        <span className="expression-result">{result}</span>
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
                    </div>

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
                          updateExpressionColor(expression.id, event.target.value)
                        }
                      />
                    </label>

                    <button
                      className="remove-button"
                      onClick={() => removeExpression(expression.id)}
                      title="Remove expression"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <p className="hint">Try: table:, x, y, -2, 4</p>
        </section>

        <section className="panel library-panel">
          <div className="panel-header">
            <h2>Library</h2>
            <button className="new-graph-button" onClick={newGraph}>
              New
            </button>
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
            <button onClick={openImportDialog}>Import JSON</button>
            <button onClick={exportJson}>Export JSON</button>
            <button onClick={exportPng}>Export PNG</button>
            <button onClick={resetGraph}>Reset</button>
            <button onClick={saveGraph}>Save</button>
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
            »
          </button>
        ) : null}

        <div className="graph-stage">
          <GraphCanvas ref={graphCanvasRef} expressions={expressions} />

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

            <button onClick={resetView} title="Reset view" aria-label="Reset view">
              ↺
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;