interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  align?: "left" | "right";
}

export default function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  align = "right",
}: SliderProps) {
  return (
    <label className={`analog-slider analog-slider--${align}`}>
      <span className="analog-slider__label">{label}</span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}
