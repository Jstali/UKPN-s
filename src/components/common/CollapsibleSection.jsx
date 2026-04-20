import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Animated expand/collapse wrapper.
// Replaces the identical AnimatePresence+motion.div pattern used in both audit pages.
const CollapsibleSection = ({ isOpen, children, style = {} }) => (
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

export default CollapsibleSection;
