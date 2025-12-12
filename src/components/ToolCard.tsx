
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Tool } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { BookmarkIcon } from './icons/UtilityIcons';
import { useTiltEffect } from '../hooks/useTiltEffect';

interface ToolCardProps {
  tool: Tool;
}

const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const ToolCard: React.FC<ToolCardProps> = ({ tool }) => {
  const auth = useAuth();
  const tiltRef = useTiltEffect<HTMLDivElement>();
  const isSaved = auth?.currentUser?.savedTools?.includes(tool.id) || false;
  const [isHovered, setIsHovered] = useState(false);

  const handleSaveToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (auth?.toggleSaveTool) {
      auth.toggleSaveTool(tool.id);
    }
  };

  return (
    <motion.div
      ref={tiltRef}
      className="relative group tilt-card h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Link
        to={`/tools/${tool.slug}`}
        className="block glass rounded-xl border border-white/10 shadow-lg group-hover:border-brand-primary/50 group-hover:shadow-glow-blue transition-all duration-300 h-full relative overflow-hidden glare-effect hover-glow"
      >
        {/* Animated gradient border effect */}
        <motion.div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(45deg, rgba(0, 133, 255, 0.3), rgba(138, 43, 226, 0.3))',
            filter: 'blur(20px)',
            zIndex: -1,
          }}
          animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
        />

        <div className="p-6">
          <div className="flex items-start space-x-4">
            {/* Animated logo with scale effect */}
            <motion.img
              src={tool.logoUrl}
              alt={`${tool.name} logo`}
              className="w-16 h-16 rounded-md object-cover flex-shrink-0 mt-1"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <motion.h3
                  className="text-lg font-bold text-light-primary pr-8"
                  animate={isHovered ? { x: 5 } : { x: 0 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {tool.name}
                </motion.h3>
                <motion.div
                  className="flex items-center space-x-1 text-yellow-500"
                  animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
                >
                  <StarIcon className="w-5 h-5" />
                  <span className="font-bold text-light-secondary">{tool.rating}</span>
                </motion.div>
              </div>
              <p className="mt-1 text-sm text-light-secondary line-clamp-2">{tool.summary}</p>
            </div>
          </div>

          {/* Animated tags with stagger effect */}
          <div className="mt-4 flex flex-wrap gap-2">
            {tool.tags.slice(0, 3).map((tag, index) => (
              <motion.span
                key={tag}
                className="px-2 py-1 text-xs font-medium bg-gray-800 text-gray-300 rounded-full hover:bg-brand-primary/20 hover:text-brand-primary transition-colors"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.1 }}
              >
                {tag}
              </motion.span>
            ))}
          </div>
        </div>
      </Link>

      {/* Animated bookmark button */}
      {auth?.currentUser && (
        <motion.button
          onClick={handleSaveToggle}
          className="absolute top-4 right-4 p-2 rounded-full bg-dark-secondary/50 backdrop-blur-sm text-light-secondary hover:text-brand-primary transition-colors z-10"
          aria-label={isSaved ? 'Unsave tool' : 'Save tool'}
          whileHover={{ scale: 1.2, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <BookmarkIcon className="w-5 h-5" filled={isSaved} />
        </motion.button>
      )}
    </motion.div>
  );
};

export default ToolCard;