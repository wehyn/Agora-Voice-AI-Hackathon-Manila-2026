'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, Clock, MapPin } from 'lucide-react';

interface NavigationIslandProps {
  isNavigating: boolean;
  eta: string | null;
  distance: string | null;
  destinationName: string | null;
}

export default function NavigationIsland({
  isNavigating,
  eta,
  distance,
  destinationName,
}: NavigationIslandProps) {
  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="glass-panel px-4 py-3 min-w-[180px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <Navigation size={14} className="text-blue-400" />
            <span className="text-[11px] uppercase tracking-widest text-white/50 font-medium">
              Navigating
            </span>
          </div>

          {destinationName && (
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={13} className="text-pink-400 shrink-0" />
              <span className="text-[13px] text-white/80 truncate max-w-[160px]">
                {destinationName}
              </span>
            </div>
          )}

          <div className="flex items-center gap-4">
            {eta && (
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-white/40" />
                <span className="text-[15px] font-medium text-white">
                  {eta}
                </span>
              </div>
            )}
            {distance && (
              <span className="text-[13px] text-white/50">{distance}</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
