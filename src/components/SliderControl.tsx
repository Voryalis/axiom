import { useState } from "react";

type SliderControlProps = {
  expressionId: string;
  slider: {
    value: number;
    min: number;
    max: number;
    step: number;
  };
  color: string;
  onSliderValueChange: (id: string, value: number) => void;
  onSliderConfigChange: (
    id: string,
    patch: Partial<{ min: number; max: number; step: number }>,
  ) => void;
  formatSliderConfigNumber: (value: number) => string;
  formatSliderUiCompactNumber: (value: number) => string;
};

export default function SliderControl({
  expressionId,
  slider,
  color,
  onSliderValueChange,
  onSliderConfigChange,
  formatSliderConfigNumber,
  formatSliderUiCompactNumber,
}: SliderControlProps) {
  const [sliderDrafts, setSliderDrafts] = useState<
    Partial<{ min: string; max: string; step: string }>
  >({});
  const [editingSliderField, setEditingSliderField] = useState<
    Partial<Record<"min" | "max" | "step", boolean>>
  >({});

  function updateSliderConfigFromInput(field: "min" | "max" | "step", value: string) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return;
    onSliderConfigChange(expressionId, { [field]: parsedValue });
  }

  function setSliderDraftValue(field: "min" | "max" | "step", value: string) {
    setSliderDrafts((current) => ({ ...current, [field]: value }));
  }

  function clearSliderDraftValue(field: "min" | "max" | "step") {
    setSliderDrafts((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function setSliderFieldEditingState(field: "min" | "max" | "step", isEditing: boolean) {
    setEditingSliderField((current) => {
      const next = { ...current };
      if (isEditing) next[field] = true;
      else delete next[field];
      return next;
    });
  }

  function commitSliderFieldDraft(field: "min" | "max" | "step", value: string) {
    updateSliderConfigFromInput(field, value);
    clearSliderDraftValue(field);
  }

  function handleSliderFieldKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    field: "min" | "max" | "step",
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      clearSliderDraftValue(field);
      event.currentTarget.dataset.skipSliderFieldBlurCommit = "true";
      event.currentTarget.blur();
      setSliderFieldEditingState(field, false);
      return;
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      ["s", "r", "0", "w", "d"].includes(event.key.toLowerCase())
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function handleSliderFieldBlur(
    event: React.FocusEvent<HTMLInputElement>,
    field: "min" | "max" | "step",
  ) {
    if (event.currentTarget.dataset.skipSliderFieldBlurCommit === "true") {
      delete event.currentTarget.dataset.skipSliderFieldBlurCommit;
      setSliderFieldEditingState(field, false);
      return;
    }

    commitSliderFieldDraft(field, event.currentTarget.value);
    setSliderFieldEditingState(field, false);
  }

  const clampedSliderValue = Math.max(slider.min, Math.min(slider.max, slider.value));
  const sliderRange = slider.max - slider.min;
  const sliderProgress =
    sliderRange > 0 ? ((clampedSliderValue - slider.min) / sliderRange) * 100 : 0;

  return (
    <>
      <div className="slider-control">
        {editingSliderField.min ? (
          <input
            className="slider-endpoint-input"
            type="text"
            value={sliderDrafts.min ?? formatSliderConfigNumber(slider.min)}
            onChange={(event) => setSliderDraftValue("min", event.target.value)}
            onBlur={(event) => handleSliderFieldBlur(event, "min")}
            onKeyDown={(event) => handleSliderFieldKeyDown(event, "min")}
            autoFocus
            aria-label="Slider min"
          />
        ) : (
          <button
            type="button"
            className="slider-endpoint-label"
            onClick={() => setSliderFieldEditingState("min", true)}
            aria-label="Edit slider min"
          >
            {formatSliderUiCompactNumber(slider.min)}
          </button>
        )}
        <input
          type="range"
          min={slider.min}
          max={slider.max}
          step={slider.step}
          value={clampedSliderValue}
          style={{
            accentColor: color,
            color,
            ["--slider-active-color" as string]: color,
            ["--slider-progress" as string]: `${sliderProgress}%`,
          }}
          onChange={(event) => onSliderValueChange(expressionId, Number(event.target.value))}
        />
        {editingSliderField.max ? (
          <input
            className="slider-endpoint-input"
            type="text"
            value={sliderDrafts.max ?? formatSliderConfigNumber(slider.max)}
            onChange={(event) => setSliderDraftValue("max", event.target.value)}
            onBlur={(event) => handleSliderFieldBlur(event, "max")}
            onKeyDown={(event) => handleSliderFieldKeyDown(event, "max")}
            autoFocus
            aria-label="Slider max"
          />
        ) : (
          <button
            type="button"
            className="slider-endpoint-label"
            onClick={() => setSliderFieldEditingState("max", true)}
            aria-label="Edit slider max"
          >
            {formatSliderUiCompactNumber(slider.max)}
          </button>
        )}
      </div>
      {editingSliderField.step ? (
        <label className="slider-step-control">
          <span>step</span>
          <input
            type="text"
            value={sliderDrafts.step ?? formatSliderConfigNumber(slider.step)}
            onChange={(event) => setSliderDraftValue("step", event.target.value)}
            onBlur={(event) => handleSliderFieldBlur(event, "step")}
            onKeyDown={(event) => handleSliderFieldKeyDown(event, "step")}
            autoFocus
            aria-label="Slider step"
          />
        </label>
      ) : (
        <label className="slider-step-control">
          <span>step</span>
          <button
            type="button"
            className="slider-step-label"
            onClick={() => setSliderFieldEditingState("step", true)}
            aria-label="Edit slider step"
          >
            {formatSliderUiCompactNumber(slider.step)}
          </button>
        </label>
      )}
    </>
  );
}
