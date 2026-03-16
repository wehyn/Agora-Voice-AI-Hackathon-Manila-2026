'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResponseIslandProps {
  text: string | null;
  visible: boolean;
  onDismiss: () => void;
}

export default function ResponseIsland({
  text,
  visible,
  onDismiss,
}: ResponseIslandProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (visible && text) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(onDismiss, 6000);
    }
    return () => clearTimeout(timerRef.current);
  }, [visible, text, onDismiss]);

  return (
    <AnimatePresence>
      {visible && text && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="glass-panel px-5 py-3 max-w-md"
        >
          <p className="text-[15px] leading-relaxed tracking-wide text-white/90">
            {text}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
