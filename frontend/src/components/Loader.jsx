import { motion, AnimatePresence } from 'framer-motion';

/**
 * Loader - Animated loading spinner with multiple variants
 */
export default function Loader({ size = 'md', variant = 'spinner', text }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  if (variant === 'dots') {
    return (
      <div className="flex items-center justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-primary rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
        {text && <span className="text-text-secondary text-sm ml-2">{text}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        className={`${sizeClasses[size]} border-2 border-card-border border-t-primary rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {text && <span className="text-text-secondary text-sm mt-2">{text}</span>}
    </div>
  );
}

/**
 * LoadingOverlay - Full-screen loading overlay
 */
export function LoadingOverlay({ isLoading, text = 'Loading...' }) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 bg-overlay z-overlay flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Loader size="lg" text={text} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Skeleton - Placeholder loading component
 */
export function Skeleton({ height = 'h-4', width = 'w-full', rounded = true }) {
  return (
    <div
      className={`bg-card-bg-strong animate-pulse ${height} ${width} ${rounded ? 'rounded' : ''}`}
    />
  );
}

/**
 * CardSkeleton - Weather card placeholder
 */
export function CardSkeleton() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex justify-between">
        <div className="h-5 w-24 bg-card-bg-strong rounded animate-pulse" />
        <div className="h-6 w-16 bg-card-bg-strong rounded-full animate-pulse" />
      </div>
      <div className="h-32 bg-card-bg-strong rounded-full animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 bg-card-bg-strong rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-card-bg-strong rounded animate-pulse" />
      </div>
    </div>
  );
}