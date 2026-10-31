import { useEffect, useRef } from "react";

interface WaveVisualizerProps {
  active: boolean;
  analyser: AnalyserNode | null;
}

const bars = [
  { x: 783, y: 215, width: 14, height: 15 },
  { x: 803, y: 190, width: 14, height: 40 },
  { x: 823, y: 168, width: 14, height: 84 },
  { x: 843, y: 210, width: 14, height: 84 },
  { x: 863, y: 210, width: 14, height: 40 },
  { x: 883, y: 234, width: 14, height: 15 },
];

// The reference bars occupy y=168..294.  The old viewBox ended at exactly
// those coordinates, so animated scaling clipped the two tall bars at both
// ends.  Keep the reference geometry intact and reserve 12 units on each
// side for animation and rounded-cap breathing room.
const VIEWBOX_TOP = 156;
const VIEWBOX_BOTTOM = 306;
const VISUAL_PADDING = 4;
const MAX_SCALE = 1.18;

function scaleLimit(bar: (typeof bars)[number]) {
  const center = bar.y + bar.height / 2;
  const halfHeight = bar.height / 2;
  const topRoom = (center - (VIEWBOX_TOP + VISUAL_PADDING)) / halfHeight;
  const bottomRoom = (VIEWBOX_BOTTOM - VISUAL_PADDING - center) / halfHeight;
  return Math.max(1, Math.min(MAX_SCALE, topRoom, bottomRoom));
}

export default function WaveVisualizer({ active, analyser }: WaveVisualizerProps) {
  const barRefs = useRef<Array<SVGRectElement | null>>([]);

  useEffect(() => {
    let frame = 0;
    const samples = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      if (active) {
        if (analyser && samples) analyser.getByteFrequencyData(samples);
        bars.forEach((bar, index) => {
          const sample = samples ? samples[(index * 7) % samples.length] / 255 : .45 + Math.abs(Math.sin(frame * .09 + index * .7)) * .35;
          // Compress the analyser range before applying it.  This retains a
          // visible response without allowing a loud transient to reach the
          // SVG viewport and flatten a rounded end.
          const targetScale = 1 + Math.pow(sample, .85) * .18;
          const scale = Math.min(targetScale, scaleLimit(bar));
          const center = bar.y + bar.height / 2;
          barRefs.current[index]?.setAttribute("transform", `translate(0 ${center * (1 - scale)}) scale(1 ${scale})`);
        });
      } else {
        barRefs.current.forEach((bar) => bar?.removeAttribute("transform"));
      }
      frame += 1;
      frame = window.requestAnimationFrame(draw);
    };

    draw();
    return () => window.cancelAnimationFrame(frame);
  }, [active, analyser]);

  return (
    <svg
      ref={(node) => {
        if (node) node.setAttribute("aria-label", active ? "Audio waveform active" : "Audio waveform idle");
      }}
      className="wave-visualizer"
      viewBox="783 156 114 150"
      preserveAspectRatio="none"
      role="img"
      aria-label={active ? "Audio waveform active" : "Audio waveform idle"}
    >
      {bars.map((bar, index) => (
        <rect
          key={bar.x}
          ref={(node) => {
            barRefs.current[index] = node;
          }}
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
          rx={bar.width / 2}
          fill="#F4F4F4"
        />
      ))}
    </svg>
  );
}
