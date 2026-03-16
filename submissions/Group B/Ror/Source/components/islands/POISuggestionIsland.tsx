'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, X } from 'lucide-react';
import type { POI } from '@/types/navigation';

interface POISuggestionIslandProps {
  pois: POI[];
  visible: boolean;
  onNavigate: (poi: POI) => void;
  onDismiss: () => void;
}

export default function POISuggestionIsland({
  pois,
  visible,
  onNavigate,
  onDismiss,
}: POISuggestionIslandProps) {
  return (
    <AnimatePresence>
      {visible && pois.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="glass-panel p-4 w-[260px] max-h-[320px] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-widest text-white/50 font-medium">
              Nearby
            </span>
            <button
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={14} className="text-white/40" />
            </button>
          </div>

          <div className="space-y-2">
            {pois.slice(0, 3).map((poi, i) => (
              <div
                key={`${poi.name}-${i}`}
                className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin size={14} className="text-pink-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[13px] text-white/90 truncate">
                      {poi.name}
                    </p>
                    {poi.distance !== undefined && (
                      <p className="text-[11px] text-white/40">
                        {poi.distance < 1
                          ? `${Math.round(poi.distance * 1000)}m`
                          : `${poi.distance.toFixed(1)} km`}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onNavigate(poi)}
                  className="p-1.5 rounded-full bg-blue-500/20 hover:bg-blue-500/30 transition-colors shrink-0"
                >
                  <Navigation size={12} className="text-blue-400" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
