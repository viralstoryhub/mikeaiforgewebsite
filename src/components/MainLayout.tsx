import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './Header';
import Footer from './Footer';
import CommandPalette from './CommandPalette';
import FloatingCTA from './FloatingCTA';
import CookieConsent from './CookieConsent';
import LeadMagnetModal from './LeadMagnetModal';
import PageTransition from './PageTransition';
import MobileBottomNav from './MobileBottomNav';
import { AINewsTicker } from './AINewsTicker';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/' || location.pathname === '';

  return (
    <div className="flex flex-col min-h-screen text-light-secondary">
      <Header />
      {isHomePage && <AINewsTicker />}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      <Footer />
      <FloatingCTA />
      <CookieConsent />
      <LeadMagnetModal />
      <CommandPalette />
      <MobileBottomNav />
    </div>
  );
};

export default MainLayout;