export type LibraryPanelGraph = {
  id: string;
  title: string;
  updatedAt: string;
};

type LibraryPanelProps<TGraph extends LibraryPanelGraph> = {
  library: TGraph[];
  activeGraphId: string | null;
  onLoadGraph: (graph: TGraph) => void;
  onDeleteGraph: (graphId: string) => void;
};

function LibraryPanel<TGraph extends LibraryPanelGraph>({
  library,
  activeGraphId,
  onLoadGraph,
  onDeleteGraph,
}: LibraryPanelProps<TGraph>) {
  return (
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
                onClick={() => onLoadGraph(graph)}
              >
                <span>{graph.title || "Untitled Graph"}</span>
                <small>{new Date(graph.updatedAt).toLocaleString()}</small>
              </button>

              <button
                className="remove-button library-delete-button"
                onClick={() => onDeleteGraph(graph.id)}
                title="Delete saved graph"
                aria-label="Delete saved graph"
                type="button"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default LibraryPanel;
