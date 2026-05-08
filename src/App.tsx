import { useState } from "react";
import GraphCanvas, { type GraphExpression } from "./components/GraphCanvas";
import "./App.css";

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

function App() {
  const [expressions, setExpressions] = useState<GraphExpression[]>(DEFAULT_EXPRESSIONS);

  function updateExpression(id: string, raw: string) {
    setExpressions((current) =>
      current.map((expression) =>
        expression.id === id ? { ...expression, raw } : expression,
      ),
    );
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
  }

  function removeExpression(id: string) {
    setExpressions((current) => {
      if (current.length === 1) return current;
      return current.filter((expression) => expression.id !== id);
    });
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
              <div className="expression-card" key={expression.id}>
                <span
                  className="color-dot"
                  style={{ background: expression.color }}
                />
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
          <span>Untitled Graph</span>
          <button>Save</button>
        </div>

        <div className="graph-stage">
          <GraphCanvas expressions={expressions} />
        </div>
      </section>
    </main>
  );
}

export default App;