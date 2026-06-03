type SettingsPopoverProps = {
  settingsSaveStatus: string;
  showGraphDetails: boolean;
  hasVisibleGraphDetails: boolean;
  isGridVisible: boolean;
  isMinorGridVisible: boolean;
  isAxesVisible: boolean;
  isAxisLabelsVisible: boolean;
  areIntersectionsVisible: boolean;
  onClose: () => void;
  onToggleGraphDetails: () => void;
  onToggleGrid: () => void;
  onToggleMinorGrid: () => void;
  onToggleAxes: () => void;
  onToggleAxisLabels: () => void;
  onToggleIntersections: () => void;
};

function renderSettingsCheckbox(isChecked: boolean) {
  return isChecked ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect width="18" height="18" x="3" y="3" rx="2" />
    </svg>
  );
}

export default function SettingsPopover({
  settingsSaveStatus,
  showGraphDetails,
  hasVisibleGraphDetails,
  isGridVisible,
  isMinorGridVisible,
  isAxesVisible,
  isAxisLabelsVisible,
  areIntersectionsVisible,
  onClose,
  onToggleGraphDetails,
  onToggleGrid,
  onToggleMinorGrid,
  onToggleAxes,
  onToggleAxisLabels,
  onToggleIntersections,
}: SettingsPopoverProps) {
  return (
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
              <span className="settings-save-badge">{settingsSaveStatus}</span>
            ) : null}
          </div>
          <p>Display options for graph guides and analysis overlays.</p>
        </div>

        <button
          className="settings-close-button"
          onClick={onClose}
          title="Close settings"
          aria-label="Close settings"
        >
          <svg className="icon-fill" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.344 2.343h-.001a8 8 0 0 1 11.314 11.314A8.002 8.002 0 0 1 .234 10.089a8 8 0 0 1 2.11-7.746Zm1.06 10.253a6.5 6.5 0 1 0 9.108-9.275 6.5 6.5 0 0 0-9.108 9.275ZM6.03 4.97 8 6.94l1.97-1.97a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l1.97 1.97a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-1.97 1.97a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L6.94 8 4.97 6.03a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018Z" />
          </svg>
        </button>
      </div>

      <section className="settings-section">
        <h3>Appearance</h3>

        <div className="settings-subgroup">
          <h4>Theme</h4>
          <div
            className="settings-theme-options"
            role="group"
            aria-label="Theme options"
          >
            <button
              className="settings-theme-option settings-theme-option-active"
              type="button"
              aria-pressed="true"
              disabled
            >
              Dark (current)
            </button>
            <button
              className="settings-theme-option"
              type="button"
              aria-pressed="false"
              disabled
            >
              Light (coming later)
            </button>
          </div>
          <small className="settings-theme-note">
            Theme switching is planned, but only dark mode is available right
            now.
          </small>
        </div>
      </section>

      <section className="settings-section">
        <h3>Graph display</h3>

        <div className="settings-row">
          <div>
            <span>Show graph details</span>
            <small>Master switch for grid, axes, and analysis overlays.</small>
          </div>
          <button
            className={`setting-switch ${
              hasVisibleGraphDetails ? "setting-switch-active" : ""
            }`}
            type="button"
            aria-pressed={hasVisibleGraphDetails}
            onClick={onToggleGraphDetails}
          >
            <span />
          </button>
        </div>

        <div className="settings-subgroup">
          <h4>Grid</h4>
          <button
            className="settings-checkbox-row"
            type="button"
            aria-pressed={isGridVisible}
            disabled={!showGraphDetails}
            onClick={onToggleGrid}
          >
            <span className="settings-checkbox-icon">
              {renderSettingsCheckbox(isGridVisible)}
            </span>
            <span>
              <span>Show grid</span>
              <small>Show major grid lines.</small>
            </span>
          </button>

          <button
            className="settings-checkbox-row"
            type="button"
            aria-pressed={isMinorGridVisible}
            disabled={!showGraphDetails || !isGridVisible}
            onClick={onToggleMinorGrid}
          >
            <span className="settings-checkbox-icon">
              {renderSettingsCheckbox(isMinorGridVisible)}
            </span>
            <span>
              <span>Show minor grid</span>
              <small>Show subdivision grid lines between major lines.</small>
            </span>
          </button>
        </div>

        <div className="settings-subgroup">
          <h4>Axes</h4>
          <button
            className="settings-checkbox-row"
            type="button"
            aria-pressed={isAxesVisible}
            disabled={!showGraphDetails}
            onClick={onToggleAxes}
          >
            <span className="settings-checkbox-icon">
              {renderSettingsCheckbox(isAxesVisible)}
            </span>
            <span>
              <span>Show axes</span>
              <small>Show x- and y-axis lines.</small>
            </span>
          </button>

          <button
            className="settings-checkbox-row"
            type="button"
            aria-pressed={isAxisLabelsVisible}
            disabled={!showGraphDetails || !isAxesVisible}
            onClick={onToggleAxisLabels}
          >
            <span className="settings-checkbox-icon">
              {renderSettingsCheckbox(isAxisLabelsVisible)}
            </span>
            <span>
              <span>Show axis labels</span>
              <small>Show numeric labels along the axes.</small>
            </span>
          </button>
        </div>

        <div className="settings-subgroup">
          <h4>Analysis</h4>
          <button
            className="settings-checkbox-row"
            type="button"
            aria-pressed={areIntersectionsVisible}
            disabled={!showGraphDetails}
            onClick={onToggleIntersections}
          >
            <span className="settings-checkbox-icon">
              {renderSettingsCheckbox(areIntersectionsVisible)}
            </span>
            <span>
              <span>Show intersections</span>
              <small>Show detected curve intersection points.</small>
            </span>
          </button>
        </div>

        <div className="settings-subgroup">
          <h4>Coordinate labels</h4>
          <div
            className="settings-theme-options"
            role="group"
            aria-label="Coordinate label mode options"
          >
            <button
              className="settings-theme-option settings-theme-option-active"
              type="button"
              aria-pressed="true"
              disabled
            >
              Decimal
            </button>
            <button
              className="settings-theme-option"
              type="button"
              aria-pressed="false"
              disabled
            >
              Symbolic / π
            </button>
          </div>
          <small className="settings-theme-note">
            Decimal coordinate labels are active. Symbolic labels are planned
            for later.
          </small>
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
  );
}
