'use client';

import { motion } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'disconnected';

interface VoiceControlIslandProps {
  state: VoiceState;
  onToggle: () => void;
  agentConnected: boolean;
}

export default function VoiceControlIsland({
  state,
  onToggle,
  agentConnected,
}: VoiceControlIslandProps) {
  const isListening = state === 'listening';
  const isProcessing = state === 'processing';

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.92 }}
        className="relative w-16 h-16 rounded-full flex items-center justify-center transition-colors"
        style={{
          background: isListening
            ? 'rgba(59, 130, 246, 0.2)'
            : 'rgba(255, 255, 255, 0.08)',
          border: `1px solid ${isListening ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}
      >
        {isListening && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid rgba(59, 130, 246, 0.3)' }}
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: '2px solid rgba(59, 130, 246, 0.2)' }}
              animate={{ scale: [1, 2.0], opacity: [0.4, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut',
                delay: 0.3,
              }}
            />
          </>
        )}

        {isProcessing ? (
          <Loader2 size={22} className="text-white/70 animate-spin" />
        ) : isListening ? (
          <Mic size={22} className="text-blue-400" />
        ) : (
          <MicOff size={22} className="text-white/50" />
        )}
      </motion.button>

      <span className="text-[12px] tracking-wide text-white/40">
        {!agentConnected
          ? 'Connecting...'
          : isListening
            ? 'Listening...'
            : isProcessing
              ? 'Processing...'
              : 'Tap to speak'}
      </span>
    </div>
  );
}
