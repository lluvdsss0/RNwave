import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import ReferenceKnobArtwork from "./ReferenceKnobArtwork";

interface KnobProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const LAST_STEP = 10;
const KNOB_START_ANGLE = 22;
const DEGREES_PER_STEP = 35;

function clampStep(value: number) {
  return Math.min(LAST_STEP, Math.max(1, Math.round(value)));
}

interface DragState {
  centerX: number;
  centerY: number;
  lastAngle: number;
  position: number;
  lastStep: number;
}

export default function Knob({ label, value, onChange }: KnobProps) {
  const displayLabel = label[0].toUpperCase() + label.slice(1);
  const drag = useRef<DragState | null>(null);
  const faceRef = useRef<HTMLButtonElement>(null);
  const [dragStep, setDragStep] = useState<number | null>(null);
  const step = clampStep(value);
  const displayStep = dragStep ?? step;
  const angle = KNOB_START_ANGLE + (displayStep - 1) * DEGREES_PER_STEP;

  useEffect(() => {
    const face = faceRef.current;
    if (!face) return;
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      event.preventDefault();
      onChange(clampStep(step + (event.deltaY < 0 ? 1 : -1)));
    };
    face.addEventListener("wheel", onWheel, { passive: false });
    return () => face.removeEventListener("wheel", onWheel);
  }, [onChange, step]);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = event.currentTarget.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;

    drag.current = {
      centerX,
      centerY,
      lastAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI),
      position: displayStep - 1,
      lastStep: displayStep,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const currentDrag = drag.current;
    if (!currentDrag) return;

    const pointerAngle = Math.atan2(
      event.clientY - currentDrag.centerY,
      event.clientX - currentDrag.centerX,
    ) * (180 / Math.PI);
    let angleDelta = pointerAngle - currentDrag.lastAngle;
    if (angleDelta > 180) angleDelta -= 360;
    if (angleDelta < -180) angleDelta += 360;
    currentDrag.lastAngle = pointerAngle;

    if (angleDelta === 0) return;
    currentDrag.position = Math.min(
      LAST_STEP - 1,
      Math.max(0, currentDrag.position + angleDelta / DEGREES_PER_STEP),
    );

    const nextStep = clampStep(currentDrag.position + 1);
    if (nextStep === currentDrag.lastStep) return;

    currentDrag.lastStep = nextStep;
    setDragStep(nextStep);
    onChange(nextStep);
  }

  function onPointerEnd() {
    drag.current = null;
    window.setTimeout(() => setDragStep(null), 0);
  }

  return (
    <div className="knob">
      <button
        ref={faceRef}
        className="knob__face"
        type="button"
        role="slider"
        aria-label={`${displayLabel} ${step}`}
        aria-valuemin={1}
        aria-valuemax={LAST_STEP}
        aria-valuenow={step}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onPointerEnd}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowRight") onChange(Math.min(LAST_STEP, step + 1));
          if (event.key === "ArrowDown" || event.key === "ArrowLeft") onChange(Math.max(1, step - 1));
        }}
      >
        <ReferenceKnobArtwork label={label} />
        <span className="knob__inner" aria-hidden="true" />
        <span
          className="knob__rotor"
          style={{ transform: `rotate(${angle}deg)` } as CSSProperties}
          aria-hidden="true"
        >
          <span className="knob__pointer" />
          <span className="knob__label">{displayLabel}</span>
        </span>
      </button>
    </div>
  );
}
