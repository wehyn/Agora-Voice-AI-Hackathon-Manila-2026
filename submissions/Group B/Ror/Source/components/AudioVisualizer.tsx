'use client';

import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioTrack: MediaStreamTrack | null | undefined;
  barCount?: number;
  className?: string;
}

export default function AudioVisualizer({
  audioTrack,
  barCount = 5,
  className = '',
}: AudioVisualizerProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const animRef = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioTrack) return;

    const start = async () => {
      try {
        ctxRef.current = new AudioContext();
        analyserRef.current = ctxRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        analyserRef.current.smoothingTimeConstant = 0.6;

        const stream = new MediaStream([audioTrack]);
        const source = ctxRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        const animate = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);

          const segSize = Math.floor(data.length / barCount);
          barsRef.current.forEach((bar, i) => {
            if (!bar) return;
            const start = i * segSize;
            let sum = 0;
            for (let j = start; j < start + segSize; j++) sum += data[j] || 0;
            const avg = sum / segSize;
            const h = Math.max(4, (avg / 255) * 40);
            bar.style.height = `${h}px`;
          });

          animRef.current = requestAnimationFrame(animate);
        };
        animate();
      } catch (err) {
        console.error('AudioVisualizer error:', err);
      }
    };

    start();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ctxRef.current?.close();
    };
  }, [audioTrack, barCount]);

  return (
    <div className={`flex items-center justify-center gap-[3px] h-10 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className="w-[3px] rounded-full bg-blue-400/70 transition-[height] duration-75"
          style={{ height: '4px' }}
        />
      ))}
    </div>
  );
}
