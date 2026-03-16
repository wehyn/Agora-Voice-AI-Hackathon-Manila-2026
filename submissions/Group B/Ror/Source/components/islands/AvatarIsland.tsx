'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Phone } from 'lucide-react';
import type { AvatarState } from '@/types/conversation';

interface AvatarIslandProps {
  state: AvatarState;
  visible: boolean;
  responseText?: string | null;
  onEndConversation?: () => void;
}

const STATE_COLORS: Record<AvatarState, { bg: string; ring: string; glow: string }> = {
  idle: {
    bg: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    ring: 'rgba(99, 102, 241, 0.3)',
    glow: '0 0 20px rgba(99, 102, 241, 0.2)',
  },
  connecting: {
    bg: 'linear-gradient(135deg, #eab308, #f59e0b)',
    ring: 'rgba(234, 179, 8, 0.4)',
    glow: '0 0 24px rgba(234, 179, 8, 0.3)',
  },
  listening: {
    bg: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    ring: 'rgba(59, 130, 246, 0.4)',
    glow: '0 0 24px rgba(59, 130, 246, 0.3)',
  },
  thinking: {
    bg: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
    ring: 'rgba(168, 85, 247, 0.5)',
    glow: '0 0 28px rgba(139, 92, 246, 0.4)',
  },
  speaking: {
    bg: 'linear-gradient(135deg, #22c55e, #10b981)',
    ring: 'rgba(34, 197, 94, 0.4)',
    glow: '0 0 28px rgba(34, 197, 94, 0.35)',
  },
  disconnected: {
    bg: 'linear-gradient(135deg, #6b7280, #4b5563)',
    ring: 'rgba(107, 114, 128, 0.2)',
    glow: '0 0 12px rgba(107, 114, 128, 0.15)',
  },
};

const STATE_LABELS: Record<AvatarState, string> = {
  idle: 'Ready',
  connecting: 'Connecting...',
  listening: 'Listening',
  thinking: 'Thinking...',
  speaking: 'Speaking',
  disconnected: 'Disconnected',
};

function AvatarFace({ state }: { state: AvatarState }) {
  const colors = STATE_COLORS[state];

  return (
    <div className="relative flex items-center justify-center">
      {(state === 'listening' || state === 'speaking') && (
        <>
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 56,
              height: 56,
              border: `2px solid ${colors.ring}`,
            }}
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 56,
              height: 56,
              border: `2px solid ${colors.ring}`,
            }}
            animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
          />
        </>
      )}

      {state === 'thinking' && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 56,
            height: 56,
            borderTop: `2px solid ${colors.ring}`,
            borderRight: `2px solid transparent`,
            borderBottom: `2px solid transparent`,
            borderLeft: `2px solid ${colors.ring}`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <motion.div
        className="relative w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: colors.bg,
          boxShadow: colors.glow,
          border: '2px solid rgba(255, 255, 255, 0.5)',
        }}
        animate={
          state === 'speaking'
            ? { scale: [1, 1.08, 1] }
            : {}
        }
        transition={
          state === 'speaking'
            ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
            : {}
        }
      >
        <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
          <circle cx="16" cy="12" r="5" fill="rgba(255,255,255,0.9)" />
          <path d="M8 26c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="rgba(255,255,255,0.7)" />
        </svg>
      </motion.div>
    </div>
  );
}

export default function AvatarIsland({
  state,
  visible,
  onEndConversation,
}: AvatarIslandProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="glass-panel p-3 flex flex-col items-center gap-2">
            <AvatarFace state={state} />

            <span className="text-[11px] tracking-wider text-white/50 uppercase">
              {STATE_LABELS[state]}
            </span>

            {onEndConversation && (
              <button
                onClick={onEndConversation}
                className="mt-1 p-2 rounded-full bg-red-500/15 hover:bg-red-500/25 transition-colors"
                title="End conversation"
              >
                <Phone size={14} className="text-red-400 rotate-135" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
