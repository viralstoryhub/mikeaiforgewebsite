import React, { useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

type CursorMode = 'default' | 'hover' | 'click' | 'text' | 'drag';

interface CursorState {
  mode: CursorMode;
  text?: string;
}

const CustomCursor: React.FC = () => {
  const [cursorState, setCursorState] = useState<CursorState>({ mode: 'default' });
  const [isVisible, setIsVisible] = useState(false);
  
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  // Spring animation for smooth following
  const springConfig = { damping: 25, stiffness: 300, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    // Only enable custom cursor on desktop (pointer device)
    const hasPointer = window.matchMedia('(pointer: fine)').matches;
    if (!hasPointer) return;

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      setIsVisible(true);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    // Handle hover states for interactive elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Tool cards, buttons, links
      if (target.closest('a, button, [role="button"]')) {
        const text = target.closest('[data-cursor-text]')?.getAttribute('data-cursor-text');
        setCursorState({ mode: 'hover', text });
      }
      // Input fields, textareas
      else if (target.closest('input, textarea, [contenteditable="true"]')) {
        setCursorState({ mode: 'text' });
      }
      // Draggable elements
      else if (target.closest('[draggable="true"]')) {
        setCursorState({ mode: 'drag' });
      }
      // Default state
      else {
        setCursorState({ mode: 'default' });
      }
    };

    const handleMouseDown = () => setCursorState(prev => ({ ...prev, mode: 'click' }));
    const handleMouseUp = (e: MouseEvent) => {
      // Restore previous state
      handleMouseOver(e);
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [cursorX, cursorY]);

  // Don't render on touch devices
  if (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches) {
    return null;
  }

  // Get cursor size based on mode
  const getCursorSize = () => {
    switch (cursorState.mode) {
      case 'hover': return 60;
      case 'click': return 40;
      case 'text': return 20;
      case 'drag': return 50;
      default: return 32;
    }
  };

  // Get cursor styles based on mode
  const getCursorStyles = () => {
    const baseStyles = {
      width: getCursorSize(),
      height: getCursorSize(),
    };

    switch (cursorState.mode) {
      case 'hover':
        return {
          ...baseStyles,
          border: '2px solid var(--color-accent-primary)',
          backgroundColor: 'rgba(0, 133, 255, 0.15)',
        };
      case 'click':
        return {
          ...baseStyles,
          border: '2px solid var(--color-accent-primary)',
          backgroundColor: 'rgba(0, 133, 255, 0.3)',
        };
      case 'text':
        return {
          ...baseStyles,
          width: 2,
          height: 24,
          backgroundColor: 'var(--color-accent-primary)',
        };
      case 'drag':
        return {
          ...baseStyles,
          border: '2px dashed var(--color-accent-secondary)',
          backgroundColor: 'rgba(255, 0, 133, 0.15)',
        };
      default:
        return {
          ...baseStyles,
          border: '2px solid var(--color-text-tertiary)',
          backgroundColor: 'transparent',
        };
    }
  };

  return (
    <>
      {/* Hide default cursor */}
      <style>{`
        * {
          cursor: none !important;
        }
      `}</style>

      {/* Custom cursor */}
      <motion.div
        className="custom-cursor pointer-events-none fixed top-0 left-0 z-[9999] rounded-full mix-blend-difference"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          translateX: '-50%',
          translateY: '-50%',
          ...getCursorStyles(),
        }}
        animate={{
          opacity: isVisible ? 1 : 0,
          scale: cursorState.mode === 'click' ? 0.8 : 1,
        }}
        transition={{
          opacity: { duration: 0.2 },
          scale: { duration: 0.15 },
        }}
      >
        {/* Inner dot */}
        {(cursorState.mode === 'default' || cursorState.mode === 'hover') && (
          <motion.div
            className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-current"
            style={{
              translateX: '-50%',
              translateY: '-50%',
            }}
            animate={{
              scale: cursorState.mode === 'hover' ? 1.5 : 1,
            }}
          />
        )}

        {/* Cursor text label */}
        {cursorState.text && (
          <motion.div
            className="absolute top-full left-1/2 mt-2 px-2 py-1 text-xs font-medium whitespace-nowrap rounded bg-brand-primary text-white"
            style={{
              translateX: '-50%',
            }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {cursorState.text}
          </motion.div>
        )}
      </motion.div>

      {/* Trailing dot effect */}
      <motion.div
        className="custom-cursor-trail pointer-events-none fixed top-0 left-0 z-[9998] w-2 h-2 rounded-full"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          translateX: '-50%',
          translateY: '-50%',
          backgroundColor: 'var(--color-accent-primary)',
          opacity: 0.4,
        }}
        animate={{
          opacity: isVisible ? 0.4 : 0,
          scale: cursorState.mode === 'click' ? 0.5 : 1,
        }}
        transition={{
          x: { damping: 35, stiffness: 250 },
          y: { damping: 35, stiffness: 250 },
        }}
      />
    </>
  );
};

export default CustomCursor;