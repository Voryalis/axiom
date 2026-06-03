import type { PointerEvent } from "react";

type CreateMenuProps = {
  isFunctionTemplatesOpen: boolean;
  onAddExpression: () => void;
  onAddTable: () => void;
  onToggleFunctionTemplates: () => void;
  onAddTemplate: (raw: string) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
};

function CreateMenu({
  isFunctionTemplatesOpen,
  onAddExpression,
  onAddTable,
  onToggleFunctionTemplates,
  onAddTemplate,
  onPointerDown,
}: CreateMenuProps) {
  return (
    <div className="create-menu" onPointerDown={onPointerDown}>
      <button className="create-menu-primary-button" onClick={onAddExpression}>
        <span>Expression</span>
      </button>
      <button className="create-menu-primary-button" onClick={onAddTable}>
        <span>Table</span>
      </button>

      <div className="create-menu-template-section">
        <button
          className="create-menu-template-trigger"
          type="button"
          aria-expanded={isFunctionTemplatesOpen}
          onClick={onToggleFunctionTemplates}
        >
          <span>Function templates</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {isFunctionTemplatesOpen ? (
              <path d="m18 15-6-6-6 6" />
            ) : (
              <path d="m6 9 6 6 6-6" />
            )}
          </svg>
        </button>

        {isFunctionTemplatesOpen ? (
          <div className="create-menu-template-grid">
            <button type="button" onClick={() => onAddTemplate("sin(x)")}>
              sin(x)
            </button>
            <button type="button" onClick={() => onAddTemplate("cos(x)")}>
              cos(x)
            </button>
            <button type="button" onClick={() => onAddTemplate("tan(x)")}>
              tan(x)
            </button>
            <button type="button" onClick={() => onAddTemplate("sqrt(x)")}>
              sqrt(x)
            </button>
            <button type="button" onClick={() => onAddTemplate("abs(x)")}>
              abs(x)
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default CreateMenu;
