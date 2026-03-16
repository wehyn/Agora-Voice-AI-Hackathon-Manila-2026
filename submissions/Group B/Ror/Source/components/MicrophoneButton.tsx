'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';
import type { IMicrophoneAudioTrack } from 'agora-rtc-react';

interface MicrophoneButtonProps {
  isEnabled: boolean;
  onToggle: () => void;
  localMicrophoneTrack: IMicrophoneAudioTrack | null;
}

export default function MicrophoneButton({
  isEnabled,
  onToggle,
  localMicrophoneTrack,
}: MicrophoneButtonProps) {
  const [barHeights, setBarHeights] = useState<number[]>(Array(5).fill(4));
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!localMicrophoneTrack || !isEnabled) {
      setBarHeights(Array(5).fill(4));
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ctxRef.current?.close();
      ctxRef.current = null;
      return;
    }

    const setup = async () => {
      try {
        ctxRef.current = new AudioContext();
        analyserRef.current = ctxRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        analyserRef.current.smoothingTimeConstant = 0.5;

        const track = localMicrophoneTrack.getMediaStreamTrack();
        const stream = new MediaStream([track]);
        const source = ctxRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        const animate = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);

          const segSize = Math.floor(data.length / 5);
          const heights = Array(5)
            .fill(0)
            .map((_, i) => {
              let sum = 0;
              for (let j = i * segSize; j < (i + 1) * segSize; j++)
                sum += data[j] || 0;
              const avg = sum / segSize;
              return Math.max(4, Math.min(28, (avg / 255) * 36));
            });

          setBarHeights(heights);
          animRef.current = requestAnimationFrame(animate);
        };
        animate();
      } catch (err) {
        console.error('MicrophoneButton visualizer error:', err);
      }
    };

    setup();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, [localMicrophoneTrack, isEnabled]);

  return (
    <motion.button
      onClick={onToggle}
      whileTap={{ scale: 0.9 }}
      className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all"
      style={{
        background: isEnabled
          ? 'rgba(59, 130, 246, 0.15)'
          : 'rgba(255, 255, 255, 0.08)',
        border: `1px solid ${isEnabled ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`,
        backdropFilter: 'blur(20px)',
      }}
      aria-label={isEnabled ? 'Mute microphone' : 'Unmute microphone'}
    >
      {isEnabled && (
        <div className="absolute inset-0 flex items-center justify-center gap-[2px] pointer-events-none">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="w-[2.5px] rounded-full bg-blue-400/40"
              style={{ height: `${h}px`, transition: 'height 75ms' }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10">
        {isEnabled ? (
          <Mic size={22} className="text-blue-400" />
        ) : (
          <MicOff size={22} className="text-white/50" />
        )}
      </div>
    </motion.button>
  );
}
