type GraphControlsProps = {
  isViewportDirty: boolean;
  onStartZoomIn: () => void;
  onStartZoomOut: () => void;
  onStopZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
};

function GraphControls({
  isViewportDirty,
  onStartZoomIn,
  onStartZoomOut,
  onStopZoom,
  onZoomIn,
  onZoomOut,
  onResetView,
}: GraphControlsProps) {
  return (
    <div className="graph-floating-controls">
      <button
        onPointerDown={(event) => {
          event.preventDefault();
          onStartZoomIn();
        }}
        onPointerUp={onStopZoom}
        onPointerLeave={onStopZoom}
        onPointerCancel={onStopZoom}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onZoomIn();
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
          onStartZoomOut();
        }}
        onPointerUp={onStopZoom}
        onPointerLeave={onStopZoom}
        onPointerCancel={onStopZoom}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onZoomOut();
          }
        }}
        title="Zoom out"
        aria-label="Zoom out"
      >
        −
      </button>

      {isViewportDirty ? (
        <button
          onClick={onResetView}
          title="Reset view"
          aria-label="Reset view"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export default GraphControls;
