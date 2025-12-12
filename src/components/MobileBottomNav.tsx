import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Wrench, 
  MessageSquare, 
  Newspaper, 
  LayoutDashboard,
  Zap
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/tools', label: 'Tools', icon: Wrench },
  { path: '/utilities', label: 'Utils', icon: Zap },
  { path: '/forum', label: 'Forum', icon: MessageSquare },
  { path: '/news', label: 'News', icon: Newspaper },
];

const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  // Don't show on admin routes
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="h-20 md:hidden" />
      
      {/* Bottom Navigation Bar */}
      <motion.nav 
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-dark-secondary/95 backdrop-blur-lg border-t border-border-dark"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors"
              >
                {/* Active indicator */}
                {active && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 rounded-lg"
                    layoutId="mobileNavActiveIndicator"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                
                {/* Icon with animation */}
                <motion.div
                  className="relative z-10"
                  animate={{
                    scale: active ? 1.1 : 1,
                    y: active ? -2 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Icon
                    size={22}
                    className={`transition-colors ${
                      active 
                        ? 'text-brand-primary' 
                        : 'text-light-tertiary'
                    }`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  
                  {/* Active dot indicator */}
                  {active && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-2 h-2 bg-brand-primary rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    />
                  )}
                </motion.div>
                
                {/* Label */}
                <motion.span
                  className={`text-xs mt-1 font-medium transition-colors relative z-10 ${
                    active 
                      ? 'text-brand-primary' 
                      : 'text-light-tertiary'
                  }`}
                  animate={{
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {item.label}
                </motion.span>
              </Link>
            );
          })}
        </div>
        
        {/* Glow effect */}
        <motion.div
          className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.nav>
    </>
  );
};

export default MobileBottomNav;