import { useEffect, useMemo, useRef, useState } from "react";
import { all, create } from "mathjs";
import GraphCanvas, { type GraphExpression } from "./components/GraphCanvas";
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
  if (index < COLORS.length) {
    return COLORS[index];
  }

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

function isGraphLikeExpression(raw: string) {
  const trimmed = raw.trim().toLowerCase();

  if (!trimmed) return false;
  if (trimmed.startsWith("y=") || trimmed.startsWith("y =")) return true;

  return /\bx\b/.test(trimmed);
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

function evaluateMathExpression(raw: string) {
  const expression = normalizeMathExpression(raw);

  if (!expression || isGraphLikeExpression(raw)) {
    return "";
  }

  try {
    const value = math.evaluate(expression);

    if (typeof value === "number") {
      if (!Number.isFinite(value)) return "undefined";
      return `= ${Number(value.toPrecision(12)).toString()}`;
    }

    if (typeof value?.toString === "function") {
      return `= ${value.toString()}`;
    }

    return "";
  } catch {
    return "invalid";
  }
}

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const expressionInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const startingExpressions = useMemo(() => createDefaultExpressions(), []);

  const [activeGraphId, setActiveGraphId] = useState<string>(crypto.randomUUID());
  const [title, setTitle] = useState("Untitled Graph");
  const [expressions, setExpressions] = useState<GraphExpression[]>(startingExpressions);
  const [nextColorIndex, setNextColorIndex] = useState(startingExpressions.length);
  const [library, setLibrary] = useState<SavedGraph[]>(() => loadGraphLibrary());
  const [saveStatus, setSaveStatus] = useState("Clean graph");

  function focusExpression(id: string) {
    requestAnimationFrame(() => {
      expressionInputRefs.current[id]?.focus();
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

  function removeExpression(id: string) {
    setExpressions((current) => current.filter((expression) => expression.id !== id));
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

    setSaveStatus(`Saved to library ${new Date(graph.updatedAt).toLocaleTimeString()}`);
  }

  function loadGraph(graph: SavedGraph) {
    const normalized = normalizeGraph(graph);

    setActiveGraphId(normalized.id);
    setTitle(normalized.title);
    setExpressions(normalized.expressions);
    setNextColorIndex(normalized.expressions.length);

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
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeGraphId, title, expressions, nextColorIndex]);

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>Axiom</h1>
            <p>Local graphing calculator</p>
          </div>
        </div>

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
                const result = evaluateMathExpression(expression.raw);

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
                      title={expression.visible ? "Hide expression" : "Show expression"}
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
                      <input
                        ref={(element) => {
                          expressionInputRefs.current[expression.id] = element;
                        }}
                        value={expression.raw}
                        onChange={(event) =>
                          updateExpression(expression.id, event.target.value)
                        }
                        placeholder="Type an expression..."
                        spellCheck={false}
                      />

                      {result ? <span className="expression-result">{result}</span> : null}
                    </div>

                    <label className="color-picker-label" title="Change line color">
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

          <p className="hint">
            Try: y = x^2, 2 + 2, sin(pi / 2), sqrt(16)
          </p>
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

        <div className="graph-stage">
          <GraphCanvas expressions={expressions} />
        </div>
      </section>
    </main>
  );
}

export default App;