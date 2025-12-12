
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { UTILITIES_DATA, UTILITY_CATEGORIES } from '../constants';
import { TitleIcon, ListIcon, ClosedCaptionIcon, ImageIcon } from '../components/icons/UtilityIcons';
import { FilmIcon, CameraIcon, MicrophoneIcon, SparklesIcon, WandIcon } from '../components/icons/ExtraIcons';
import { useTiltEffect } from '../hooks/useTiltEffect';
import { useFavorites } from '../hooks/useFavorites';
import type { Utility } from '../types';

type CategoryTab = {
  slug: string;
  name: string;
  description: string;
};

const ALL_UTILITIES_TAB: CategoryTab = {
  slug: 'all',
  name: 'All Utilities',
  description: 'Browse the full catalog of utility tools organized by category.',
};

const FAVORITES_TAB: CategoryTab = {
  slug: 'favorites',
  name: '⭐ Favorites',
  description: 'Your starred utilities for quick access.',
};

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
    TitleIcon,
    ListIcon,
    ClosedCaptionIcon,
    ImageIcon,
    CameraIcon,
    FilmIcon,
    MicrophoneIcon,
    SparklesIcon,
    WandIcon,
};

const UtilityCard: React.FC<{ utility: Utility; onToggleFavorite?: (id: string) => void; isFavorite?: boolean }> = ({ 
  utility, 
  onToggleFavorite,
  isFavorite = false
}) => {
  const tiltRef = useTiltEffect<HTMLDivElement>();
  const IconComponent = iconMap[utility.icon];

  const badgeColors = {
    NEW: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
    POPULAR: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    PRO: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
    BETA: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
  };

  const difficultyColors = {
    Easy: 'text-green-400',
    Medium: 'text-yellow-400',
    Hard: 'text-red-400',
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(utility.id);
    }
  };

  return (
    <div ref={tiltRef} className="tilt-card h-full group">
      <Link
        to={utility.path}
        className="block p-6 bg-dark-secondary rounded-lg border border-border-dark group-hover:border-brand-primary/50 transition-all duration-300 h-full relative overflow-hidden glare-effect"
      >
        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-3 left-3 z-10 p-2 rounded-full transition-all duration-300 ${
            isFavorite
              ? 'bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30'
              : 'bg-dark-primary/60 text-light-secondary hover:bg-dark-primary hover:text-brand-primary'
          }`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>

        {/* Badge */}
        {utility.badge && (
          <div className="absolute top-3 right-3">
            <span className={`${badgeColors[utility.badge]} text-xs font-bold px-2.5 py-1 rounded-full shadow-lg`}>
              {utility.badge}
            </span>
          </div>
        )}

        {/* Icon and Title */}
        <div className="flex items-start space-x-4 mb-4">
          <div className="flex-shrink-0 bg-dark-primary p-3 rounded-lg border border-border-dark group-hover:scale-110 transition-transform duration-300">
            {IconComponent && <IconComponent className="w-6 h-6 text-brand-primary" />}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-light-primary group-hover:text-brand-primary transition-colors">
              {utility.name}
            </h3>
            <p className="mt-1 text-sm text-light-secondary line-clamp-2">{utility.description}</p>
          </div>
        </div>

        {/* Time & Difficulty */}
        {(utility.estimatedTime || utility.difficulty) && (
          <div className="flex items-center gap-4 mb-4 text-xs">
            {utility.estimatedTime && (
              <div className="flex items-center gap-1.5 text-light-secondary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{utility.estimatedTime}</span>
              </div>
            )}
            {utility.difficulty && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-light-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className={difficultyColors[utility.difficulty]}>{utility.difficulty}</span>
              </div>
            )}
          </div>
        )}

        {/* Steps */}
        {utility.steps && utility.steps.length > 0 && (
          <div className="mb-4 p-3 bg-dark-primary/50 rounded-lg border border-border-dark">
            <p className="text-xs font-semibold text-brand-primary mb-2 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              How to Use:
            </p>
            <ol className="space-y-1">
              {utility.steps.map((step, idx) => (
                <li key={idx} className="text-xs text-light-secondary flex items-start gap-2">
                  <span className="text-brand-primary font-semibold min-w-[16px]">{idx + 1}.</span>
                  <span className="flex-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Use Cases */}
        {utility.useCases && utility.useCases.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {utility.useCases.map((useCase, idx) => (
              <span
                key={idx}
                className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
              >
                {useCase}
              </span>
            ))}
          </div>
        )}

        {/* Hover Arrow */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </Link>
    </div>
  );
};


const UtilitiesPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>(ALL_UTILITIES_TAB.slug);
  const [searchTerm, setSearchTerm] = useState('');
  const { favorites, toggleFavorite, isFavorite, favoritesCount } = useFavorites();

  const categoryTabs: CategoryTab[] = [
    ALL_UTILITIES_TAB,
    FAVORITES_TAB,
    ...UTILITY_CATEGORIES.map((category) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
    })),
  ];

  const filteredUtilities = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return UTILITIES_DATA.filter((utility) => {
      // Handle favorites filter
      if (activeCategory === FAVORITES_TAB.slug) {
        if (!favorites.includes(utility.id)) {
          return false;
        }
      } else if (activeCategory !== ALL_UTILITIES_TAB.slug && utility.category !== activeCategory) {
        return false;
      }
      
      if (!term) {
        return true;
      }
      const haystack = `${utility.name} ${utility.description ?? ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [activeCategory, searchTerm, favorites]);

  const categorySections = useMemo(() => {
    // For favorites view, show all utilities without categorization
    if (activeCategory === FAVORITES_TAB.slug) {
      return [{
        category: {
          id: 'favorites',
          name: 'Favorite Utilities',
          slug: 'favorites',
          description: 'Your starred utilities for quick access',
          icon: 'StarIcon',
          subcategories: []
        },
        subSections: [{
          subcategory: {
            id: 'all-favorites',
            name: 'All Favorites',
            slug: 'all-favorites',
            description: `${favoritesCount} favorite ${favoritesCount === 1 ? 'utility' : 'utilities'}`,
            icon: 'StarIcon'
          },
          utilities: filteredUtilities
        }]
      }];
    }

    const relevantCategories =
      activeCategory === ALL_UTILITIES_TAB.slug
        ? UTILITY_CATEGORIES
        : UTILITY_CATEGORIES.filter((category) => category.slug === activeCategory);

    return relevantCategories.map((category) => {
      const subSections = category.subcategories.map((subcategory) => {
        const utilities = filteredUtilities.filter(
          (utility) =>
            utility.category === category.slug && utility.subcategory === subcategory.slug
        );
        return { subcategory, utilities };
      });

      return {
        category,
        subSections,
      };
    });
  }, [activeCategory, filteredUtilities, favoritesCount]);

  const renderableSections =
    activeCategory === ALL_UTILITIES_TAB.slug
      ? categorySections
          .map((section) => ({
            category: section.category,
            subSections: section.subSections.filter(
              (subSection) => subSection.utilities.length > 0
            ),
          }))
          .filter((section) => section.subSections.length > 0)
      : categorySections.map((section) => ({
          category: section.category,
          subSections: section.subSections.filter(
            (subSection) => subSection.utilities.length > 0
          ),
        }));

  const activeTabMeta =
    categoryTabs.find((tab) => tab.slug === activeCategory) ?? ALL_UTILITIES_TAB;

  const hasResults = renderableSections.some((section) => section.subSections.length > 0);

  return (
    <div className="animate-fade-in-up">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-light-primary sm:text-5xl">
          AI-Powered Utility Tools
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-light-secondary sm:mt-4">
          Get instant value with free, powerful tools for creators and marketers. No login required for your first 3 uses.
        </p>
      </div>

      {/* Getting Started Guide */}
      <div className="max-w-5xl mx-auto mb-10">
        <div className="bg-gradient-to-r from-brand-primary/10 to-purple-500/10 rounded-2xl border border-brand-primary/20 p-6 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 bg-brand-primary/20 p-3 rounded-lg">
              <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-light-primary mb-2">🚀 How It Works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-dark-primary flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <p className="font-semibold text-light-primary">Choose a Tool</p>
                    <p className="text-light-secondary text-xs">Browse categories or search</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-dark-primary flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <p className="font-semibold text-light-primary">Follow Steps</p>
                    <p className="text-light-secondary text-xs">Each tool has clear instructions</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary text-dark-primary flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <p className="font-semibold text-light-primary">Get Results</p>
                    <p className="text-light-secondary text-xs">Copy, download, or share</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  NEW = Just launched
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                  POPULAR = Most used
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                  PRO = Premium feature
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  BETA = Testing phase
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Stats Bar */}
        <div className="flex items-center justify-center gap-6 py-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></div>
            <span className="text-light-secondary">
              <span className="text-2xl font-bold text-brand-primary">{UTILITIES_DATA.length}</span> Total Utilities
            </span>
          </div>
          <div className="w-px h-6 bg-border-dark"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-light-secondary">
              <span className="text-xl font-bold text-green-400">{UTILITIES_DATA.filter(u => u.badge === 'NEW').length}</span> New This Week
            </span>
          </div>
          <div className="w-px h-6 bg-border-dark"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-light-secondary">
              <span className="text-xl font-bold text-purple-400">{UTILITIES_DATA.filter(u => u.badge === 'POPULAR').length}</span> Popular
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="overflow-x-auto">
            <div className="inline-flex min-w-full gap-2">
              {categoryTabs.map((tab) => {
                const isActive = tab.slug === activeCategory;
                const count = tab.slug === 'all' 
                  ? UTILITIES_DATA.length 
                  : tab.slug === 'favorites'
                  ? favoritesCount
                  : UTILITIES_DATA.filter(u => u.category === tab.slug).length;
                return (
                  <button
                    key={tab.slug}
                    type="button"
                    onClick={() => setActiveCategory(tab.slug)}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
                      isActive
                        ? 'bg-brand-primary text-dark-primary border-brand-primary shadow-lg shadow-brand-primary/20'
                        : 'bg-dark-secondary text-light-secondary border-border-dark hover:text-light-primary hover:border-brand-primary/40'
                    }`}
                  >
                    {tab.name}
                    <span className={`ml-1.5 text-xs ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full lg:w-72">
            <label className="relative block">
              <span className="sr-only">Search utilities</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search utilities..."
                className="w-full rounded-full border border-border-dark bg-dark-secondary py-2 pl-4 pr-16 text-sm text-light-primary placeholder:text-light-secondary/60 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                autoComplete="off"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-2 my-auto inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-brand-primary hover:text-brand-primary/80 transition-colors"
                >
                  Clear
                </button>
              )}
            </label>
          </div>
        </div>

        <div className="text-center sm:text-left">
          <p className="mx-auto max-w-3xl text-light-secondary transition-colors duration-300 sm:mx-0">
            {activeTabMeta.description}
          </p>
        </div>

        <div className="space-y-10">
          {renderableSections.map((section) =>
            section.subSections.length > 0 ? (
              <section key={section.category.slug} className="space-y-4 animate-fade-in-up">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold text-light-primary">{section.category.name}</h2>
                  <p className="text-sm text-light-secondary">{section.category.description}</p>
                </div>

                <div className="space-y-4">
                  {section.subSections.map((subSection) => (
                    <details
                      key={`${section.category.slug}-${subSection.subcategory.slug}`}
                      className="group rounded-xl border border-border-dark bg-dark-secondary/60 shadow-lg shadow-black/10 backdrop-blur-sm"
                      open
                    >
                      <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-light-primary transition-colors duration-300 hover:text-brand-primary list-none marker:content-none">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{subSection.subcategory.name}</span>
                          <span className="text-xs uppercase tracking-widest text-light-secondary/70">
                            {subSection.utilities.length} {subSection.utilities.length === 1 ? 'tool' : 'tools'}
                          </span>
                        </div>
                        <span className="text-light-secondary transition-transform duration-300 group-open:-rotate-180">⌄</span>
                      </summary>

                      <div className="px-5 pb-5">
                        <p className="mb-4 text-xs text-light-secondary">{subSection.subcategory.description}</p>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          {subSection.utilities.map((utility, index) => (
                            <div
                              key={utility.id}
                              className="animate-fade-in-up h-full"
                              style={{ animationDelay: `${index * 80}ms` }}
                            >
                              <UtilityCard 
                                utility={utility} 
                                onToggleFavorite={toggleFavorite}
                                isFavorite={isFavorite(utility.id)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ) : null
          )}

          {!hasResults && (
            <div className="rounded-2xl border border-border-dark bg-dark-secondary/60 py-16 text-center shadow-inner shadow-black/40">
              {activeCategory === FAVORITES_TAB.slug && favoritesCount === 0 ? (
                <div className="space-y-4">
                  <div className="text-6xl">⭐</div>
                  <p className="text-light-primary font-semibold text-lg">No favorites yet!</p>
                  <p className="text-light-secondary max-w-md mx-auto">
                    Click the star icon on any utility card to add it to your favorites for quick access.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveCategory(ALL_UTILITIES_TAB.slug)}
                    className="mt-6 inline-flex items-center rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-dark-primary transition-colors duration-300 hover:bg-brand-primary/90"
                  >
                    Browse All Utilities
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-light-secondary">
                    No utilities match your current filters.
                    {searchTerm ? ' Try a different search term or clear your search.' : ' Please check back soon for new additions.'}
                  </p>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="mt-6 inline-flex items-center rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-dark-primary transition-colors duration-300 hover:bg-brand-primary/90"
                    >
                      Clear search
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UtilitiesPage;
