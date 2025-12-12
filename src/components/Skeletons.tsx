import React from 'react';
import { motion, type Variants } from 'framer-motion';

// Shared animation variants
const shimmerVariants: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut' as const
    }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  }
};

// Enhanced Tool Card Skeleton
export const ToolCardSkeleton: React.FC = () => {
  return (
    <motion.div
      className="relative overflow-hidden block bg-dark-secondary rounded-lg border border-border-dark p-6 shimmer"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-start space-x-4">
        <motion.div
          className="w-16 h-16 rounded-md bg-gray-700 flex-shrink-0 mt-1"
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
        />
        <div className="flex-1 space-y-3">
          <motion.div
            className="h-4 bg-gray-700 rounded w-3/4"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
          <motion.div
            className="h-3 bg-gray-700 rounded w-full"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            style={{ animationDelay: '0.1s' }}
          />
          <motion.div
            className="h-3 bg-gray-700 rounded w-5/6"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            style={{ animationDelay: '0.2s' }}
          />
        </div>
      </div>
      <motion.div
        className="mt-4 flex flex-wrap gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {[16, 20, 12].map((width, i) => (
          <motion.div
            key={i}
            className="h-4 bg-gray-700 rounded-full"
            style={{ width: `${width * 4}px` }}
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

// News Card Skeleton
export const NewsCardSkeleton: React.FC = () => {
  return (
    <motion.div
      className="relative overflow-hidden bg-dark-secondary rounded-lg border border-border-dark shimmer"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Image placeholder */}
      <motion.div
        className="w-full h-48 bg-gray-700"
        variants={shimmerVariants}
        initial="initial"
        animate="animate"
      />
      <div className="p-6 space-y-4">
        {/* Category badge */}
        <motion.div
          className="h-5 bg-gray-700 rounded-full w-20"
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
        />
        {/* Title */}
        <motion.div
          className="h-6 bg-gray-700 rounded w-3/4"
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
        />
        {/* Description lines */}
        <div className="space-y-2">
          <motion.div
            className="h-4 bg-gray-700 rounded w-full"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
          <motion.div
            className="h-4 bg-gray-700 rounded w-5/6"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
        </div>
        {/* Meta info */}
        <div className="flex items-center gap-4">
          <motion.div
            className="h-3 bg-gray-700 rounded w-24"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
          <motion.div
            className="h-3 bg-gray-700 rounded w-32"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
        </div>
      </div>
    </motion.div>
  );
};

// Forum Thread Skeleton
export const ForumThreadSkeleton: React.FC = () => {
  return (
    <motion.div
      className="relative overflow-hidden bg-dark-secondary rounded-lg border border-border-dark p-6 shimmer"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <motion.div
          className="w-12 h-12 rounded-full bg-gray-700 flex-shrink-0"
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
        />
        <div className="flex-1 space-y-3">
          {/* Title */}
          <motion.div
            className="h-5 bg-gray-700 rounded w-2/3"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
          {/* Meta info */}
          <div className="flex items-center gap-4">
            <motion.div
              className="h-3 bg-gray-700 rounded w-24"
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
            />
            <motion.div
              className="h-3 bg-gray-700 rounded w-32"
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
            />
          </div>
          {/* Preview text */}
          <div className="space-y-2">
            <motion.div
              className="h-3 bg-gray-700 rounded w-full"
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
            />
            <motion.div
              className="h-3 bg-gray-700 rounded w-4/5"
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Workflow Card Skeleton
export const WorkflowCardSkeleton: React.FC = () => {
  return (
    <motion.div
      className="relative overflow-hidden bg-dark-secondary rounded-lg border border-border-dark p-6 shimmer"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="space-y-4">
        {/* Icon + Title */}
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-lg bg-gray-700"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
          <motion.div
            className="h-5 bg-gray-700 rounded flex-1"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
        </div>
        {/* Description */}
        <div className="space-y-2">
          <motion.div
            className="h-3 bg-gray-700 rounded w-full"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
          <motion.div
            className="h-3 bg-gray-700 rounded w-3/4"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
        </div>
        {/* Tags */}
        <motion.div
          className="flex gap-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[60, 80, 50].map((width, i) => (
            <motion.div
              key={i}
              className="h-6 bg-gray-700 rounded-full"
              style={{ width: `${width}px` }}
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

// Dashboard Widget Skeleton
export const DashboardWidgetSkeleton: React.FC = () => {
  return (
    <motion.div
      className="relative overflow-hidden bg-dark-secondary rounded-xl border border-border-dark p-6 shimmer"
      variants={itemVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="space-y-4">
        {/* Widget header */}
        <div className="flex items-center justify-between">
          <motion.div
            className="h-5 bg-gray-700 rounded w-32"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
          <motion.div
            className="h-8 w-8 rounded-lg bg-gray-700"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
        </div>
        {/* Large stat */}
        <motion.div
          className="h-10 bg-gray-700 rounded w-24"
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
        />
        {/* Trend indicator */}
        <motion.div
          className="h-4 bg-gray-700 rounded w-40"
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
        />
      </div>
    </motion.div>
  );
};

// List skeleton with stagger effect
export const ResultListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <motion.div
      className="space-y-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          className="relative overflow-hidden h-12 bg-dark-secondary rounded-md shimmer"
          variants={itemVariants}
        />
      ))}
    </motion.div>
  );
};

// Full page loading skeleton
export const PageSkeleton: React.FC = () => {
  return (
    <motion.div
      className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center space-y-6">
        {/* Animated logo placeholder */}
        <motion.div
          className="rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary h-16 w-16"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        {/* Loading text */}
        <motion.div
          className="space-y-3 w-64"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="h-4 bg-gray-700 rounded w-3/4 mx-auto"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
          <motion.div
            className="h-3 bg-gray-700 rounded w-full"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
          <motion.div
            className="h-3 bg-gray-700 rounded w-5/6 mx-auto"
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
          />
        </motion.div>
      </div>
    </motion.div>
  );
};
