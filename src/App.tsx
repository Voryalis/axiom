import { useEffect, useState } from "react";
import GraphCanvas, { type GraphExpression } from "./components/GraphCanvas";
import "./App.css";

const STORAGE_KEY = "axiom.currentGraph";

type SavedGraph = {
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

function loadSavedGraph(): SavedGraph | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SavedGraph;

    if (!Array.isArray(parsed.expressions)) return null;

    return parsed;
  } catch {
    return null;
  }
}

function App() {
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

  function saveGraph() {
    const graph: SavedGraph = {
      title,
      expressions,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(graph, null, 2));
    setSaveStatus(`Saved ${new Date(graph.updatedAt).toLocaleTimeString()}`);
  }

  function resetGraph() {
    setTitle("Untitled Graph");
    setExpressions(DEFAULT_EXPRESSIONS);
    markUnsaved();
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
            <button onClick={resetGraph}>Reset</button>
            <button onClick={saveGraph}>Save</button>
          </div>
        </div>

        <div className="graph-stage">
          <GraphCanvas expressions={expressions} />
        </div>
      </section>
    </main>
  );
}

export default App;