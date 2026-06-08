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
          <path d="M10 8h.01" />
          <path d="M12 12h.01" />
          <path d="M14 8h.01" />
          <path d="M16 12h.01" />
          <path d="M18 8h.01" />
          <path d="M6 8h.01" />
          <path d="M7 16h10" />
          <path d="M8 12h.01" />
          <rect width="20" height="16" x="2" y="4" rx="2" />
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