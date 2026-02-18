import { motion } from 'framer-motion';

export function BorderTrail({
  size = 100,
  duration = 3,
  style,
}) {
  return (
    <div style={{
      position: 'absolute',
      inset: '-2px',
      borderRadius: 'inherit',
      padding: '2px',
      background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)',
      WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude',
      pointerEvents: 'none',
      overflow: 'hidden'
    }}>
      <motion.div
        style={{
          position: 'absolute',
          width: '200%',
          height: '200%',
          background: `conic-gradient(from 0deg, transparent 0deg, ${style?.color || '#3b82f6'} 90deg, transparent 180deg)`,
          ...style,
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}
