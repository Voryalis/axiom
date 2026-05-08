import { useState } from "react";
import GraphCanvas from "./components/GraphCanvas";
import "./App.css";

function App() {
  const [expression, setExpression] = useState("y = x^2");

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
          <h2>Expressions</h2>
          <div className="expression-card">
            <span className="color-dot" />
            <input
              value={expression}
              onChange={(event) => setExpression(event.target.value)}
              spellCheck={false}
            />
          </div>
          <p className="hint">Try: y = sin(x), y = x^2, y = sqrt(x)</p>
        </section>
      </aside>

      <section className="graph-area">
        <div className="topbar">
          <span>Untitled Graph</span>
          <button>Save</button>
        </div>

        <div className="graph-stage">
          <GraphCanvas expression={expression} />
        </div>
      </section>
    </main>
  );
}

export default App;
