import { useEffect, useRef } from "react";

interface WaveVisualizerProps {
  active: boolean;
  analyser: AnalyserNode | null;
}

export default function WaveVisualizer({ active, analyser }: WaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;
    const samples = analyser ? new Uint8Array(analyser.fftSize) : null;
    let animationFrame = 0;

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
        canvas.width = width * ratio;
        canvas.height = height * ratio;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      const count = 7;
      const barWidth = 8;
      const gap = 5;
      const totalWidth = count * barWidth + (count - 1) * gap;
      const startX = (width - totalWidth) / 2;
      if (active && analyser && samples) analyser.getByteTimeDomainData(samples);

      const idleHeights = [8, 23, 48, 31, 15, 8, 0];
      for (let index = 0; index < count; index += 1) {
        const sample = samples ? samples[Math.floor((index / count) * samples.length)] : 128;
        const energy = active
          ? samples
            ? Math.abs(sample - 128) / 128
            : 0.38 + Math.abs(Math.sin(frame * 0.11 + index * 0.83)) * 0.62
          : 0;
        const baseline = idleHeights[index];
        const barHeight = active
          ? Math.max(8, baseline + energy * (height * 0.55))
          : Math.max(8, baseline);
        const x = startX + index * (barWidth + gap);
        context.fillStyle = "#d6d6d6";
        context.beginPath();
        context.roundRect(x, (height - barHeight) / 2, barWidth, barHeight, barWidth / 2);
        context.fill();
      }

      frame += 1;
      animationFrame = window.requestAnimationFrame(draw);
    };

    draw();
    return () => window.cancelAnimationFrame(animationFrame);
  }, [active, analyser]);

  return <canvas ref={canvasRef} className="wave-visualizer" aria-label={active ? "Audio waveform active" : "Audio waveform idle"} />;
}
