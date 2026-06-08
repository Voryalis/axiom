import type { PointerEvent } from "react";
import { MATH_PALETTE_ITEMS } from "../graph/mathPalette";

type MathPaletteProps = {
  isOpen: boolean;
  onToggle: () => void;
  onInsert: (snippet: string) => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
};

function MathPalette({
  isOpen,
  onToggle,
  onInsert,
  onPointerDown,
}: MathPaletteProps) {
  return (
    <div className="math-keyboard" onPointerDown={onPointerDown}>
      <button
        className="math-keyboard-toggle"
        type="button"
        onClick={onToggle}
        aria-label="Open math keyboard"
        aria-expanded={isOpen}
        title="Math keyboard"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M7 9h.01" />
          <path d="M11 9h.01" />
          <path d="M15 9h.01" />
          <path d="M17 13h.01" />
          <path d="M7 13h6" />
        </svg>
      </button>

      {isOpen ? (
        <div
          className="math-keyboard-popover"
          aria-label="Math symbol keyboard"
        >
          <div className="math-keyboard-grip" aria-hidden="true" />
          <div className="math-keyboard-grid">
            {MATH_PALETTE_ITEMS.map((item) => (
              <button
                className="math-keyboard-key"
                key={item.label}
                type="button"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => onInsert(item.snippet)}
                aria-label={item.ariaLabel}
                title={item.ariaLabel}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default MathPalette;