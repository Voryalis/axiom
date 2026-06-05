import type { RefObject } from "react";

type TopbarProps = {
  title: string;
  saveStatus: string;
  isSettingsOpen: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onTitleChange: (title: string) => void;
  onOpenImportDialog: () => void;
  onImportJson: (file: File | undefined) => void;
  onExportJson: () => void;
  onExportPng: () => void;
  onResetGraph: () => void;
  onSaveGraph: () => void;
  onToggleSettings: () => void;
};

export default function Topbar({
  title,
  saveStatus,
  isSettingsOpen,
  fileInputRef,
  onTitleChange,
  onOpenImportDialog,
  onImportJson,
  onExportJson,
  onExportPng,
  onResetGraph,
  onSaveGraph,
  onToggleSettings,
}: TopbarProps) {
  return (
    <div className="topbar">
      <input
        className="title-input"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        spellCheck={false}
      />

      <div className="topbar-actions">
        <span className="save-status">{saveStatus}</span>
        <button
          onClick={onOpenImportDialog}
          title="Import JSON"
          aria-label="Import JSON"
        >
          <svg className="icon-fill" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
            <path d="M11.78 4.72a.749.749 0 1 1-1.06 1.06L8.75 3.811V9.5a.75.75 0 0 1-1.5 0V3.811L5.28 5.78a.749.749 0 1 1-1.06-1.06l3.25-3.25a.749.749 0 0 1 1.06 0l3.25 3.25Z" />
          </svg>
        </button>
        <button
          onClick={onExportJson}
          title="Export JSON"
          aria-label="Export JSON"
        >
          <svg className="icon-fill" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z" />
            <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z" />
          </svg>
        </button>
        <button
          onClick={onExportPng}
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
          onClick={onResetGraph}
          title="Reset graph"
          aria-label="Reset graph"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
        <button
          onClick={onSaveGraph}
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
          onClick={onToggleSettings}
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
        onChange={(event) => onImportJson(event.target.files?.[0])}
      />
    </div>
  );
}
