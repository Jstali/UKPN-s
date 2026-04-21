import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Animated expand/collapse wrapper.
// keepMounted=true: children stay mounted and are hidden via CSS (no remount on re-open).
//                   Use this when children have expensive initialisation (API calls, large state).
// keepMounted=false (default): children are unmounted on close (AnimatePresence exit animation).
const CollapsibleSection = ({ isOpen, children, style = {}, keepMounted = false }) => {
  if (keepMounted) {
    return (
      <div style={{
        overflow: 'hidden',
        transition: 'max-height 0.2s ease, opacity 0.2s ease',
        maxHeight: isOpen ? '2000px' : '0px',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        ...style,
      }}>
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          style={{ overflow: 'hidden', ...style }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CollapsibleSection;
