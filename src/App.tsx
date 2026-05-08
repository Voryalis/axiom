import { useEffect, useRef, useState } from "react";
import GraphCanvas, { type GraphExpression } from "./components/GraphCanvas";
import "./App.css";

const STORAGE_KEY = "axiom.currentGraph";

type SavedGraph = {
  version: number;
  title: string;
  expressions: GraphExpression[];
  updatedAt: string;
};

const DEFAULT_EXPRESSIONS: GraphExpression[] = [
  {
    id: "expr-1",
    raw: "y = x^2",
    color: "#8ab4f8",
    visible: true,
  },
  {
    id: "expr-2",
    raw: "y = sin(x)",
    color: "#a8d08d",
    visible: true,
  },
];

const COLORS = ["#8ab4f8", "#a8d08d", "#f6c177", "#c4a7e7", "#f28b82"];

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

function loadSavedGraph(): SavedGraph | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!isValidSavedGraph(parsed)) return null;

    return {
      version: parsed.version ?? 1,
      title: parsed.title,
      expressions: parsed.expressions,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const savedGraph = loadSavedGraph();

  const [title, setTitle] = useState(savedGraph?.title ?? "Untitled Graph");
  const [expressions, setExpressions] = useState<GraphExpression[]>(
    savedGraph?.expressions ?? DEFAULT_EXPRESSIONS,
  );
  const [saveStatus, setSaveStatus] = useState("Not saved");

  useEffect(() => {
    if (savedGraph?.updatedAt) {
      setSaveStatus(`Loaded ${new Date(savedGraph.updatedAt).toLocaleString()}`);
    }
  }, []);

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
    setExpressions((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        raw: "y = x",
        color: COLORS[current.length % COLORS.length],
        visible: true,
      },
    ]);
    markUnsaved();
  }

  function removeExpression(id: string) {
    setExpressions((current) => {
      if (current.length === 1) return current;
      return current.filter((expression) => expression.id !== id);
    });
    markUnsaved();
  }

  function createGraphSnapshot(): SavedGraph {
    return {
      version: 1,
      title,
      expressions,
      updatedAt: new Date().toISOString(),
    };
  }

  function saveGraph() {
    const graph = createGraphSnapshot();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(graph, null, 2));
    setSaveStatus(`Saved ${new Date(graph.updatedAt).toLocaleTimeString()}`);
  }

  function resetGraph() {
    setTitle("Untitled Graph");
    setExpressions(DEFAULT_EXPRESSIONS);
    markUnsaved();
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

      setTitle(parsed.title);
      setExpressions(parsed.expressions);
      setSaveStatus("Imported JSON");
    } catch {
      setSaveStatus("Invalid JSON graph file");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

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
            <button className="small-button" onClick={addExpression}>
              +
            </button>
          </div>

          <div className="expression-list">
            {expressions.map((expression) => (
              <div
                className={`expression-card ${expression.visible ? "" : "expression-card-hidden"}`}
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
                      background: expression.visible ? expression.color : "transparent",
                    }}
                  />
                </button>

                <input
                  value={expression.raw}
                  onChange={(event) => updateExpression(expression.id, event.target.value)}
                  spellCheck={false}
                />

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
            ))}
          </div>

          <p className="hint">Try: y = x^2, y = sin(x), y = cos(x), y = sqrt(x)</p>
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