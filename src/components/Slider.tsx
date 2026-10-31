interface SliderProps { label: string; value: number; min?: number; max?: number; step?: number; onChange: (value: number) => void; align?: "left" | "right"; }

export default function Slider({ label, value, min = 0, max = 1, step = 0.01, onChange, align = "right" }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;
  return <label className={`analog-slider analog-slider--${align}`}><span className="analog-slider__label">{label}</span><span className="analog-slider__control"><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.currentTarget.value))} onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} /><span className="analog-slider__thumb" style={{ left: `${percent}%` }} aria-hidden="true"><span /></span></span></label>;
}
