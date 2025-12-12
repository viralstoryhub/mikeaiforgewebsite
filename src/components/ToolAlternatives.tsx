import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Tool } from '../types';

interface ToolAlternativesProps {
  currentTool: Tool;
  allTools: Tool[];
  maxItems?: number;
}

const ToolAlternatives: React.FC<ToolAlternativesProps> = ({ currentTool, allTools, maxItems = 3 }) => {
  const similarTools = useMemo(() => {
    // Calculate similarity score for each tool
    const toolsWithScores = allTools
      .filter((tool) => tool.id !== currentTool.id) // Exclude current tool
      .map((tool) => {
        let score = 0;

        // Match categories (higher weight)
        const sharedCategories = tool.categories.filter((cat) =>
          currentTool.categories.includes(cat)
        );
        score += sharedCategories.length * 3;

        // Match tags (lower weight)
        const sharedTags = tool.tags.filter((tag) => currentTool.tags.includes(tag));
        score += sharedTags.length * 1;

        // Boost score if pricing model is the same
        if (tool.pricingModel === currentTool.pricingModel) {
          score += 2;
        }

        // Boost if both have/don't have free tier
        if (tool.freeTier === currentTool.freeTier) {
          score += 1;
        }

        return { tool, score, sharedCategories, sharedTags };
      })
      .filter((item) => item.score > 0) // Only include tools with some similarity
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, maxItems); // Limit results

    return toolsWithScores;
  }, [currentTool, allTools, maxItems]);

  if (similarTools.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-border-dark">
      <h3 className="text-2xl font-bold text-light-primary mb-6">
        Similar Tools & Alternatives
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {similarTools.map(({ tool, sharedCategories }) => (
          <Link
            key={tool.id}
            to={`/tools/${tool.slug}`}
            className="group relative rounded-xl border border-border-dark bg-dark-secondary p-6 transition-all duration-300 hover:border-brand-primary/60 hover:-translate-y-1"
          >
            {/* Tool Logo */}
            <div className="flex items-center gap-4 mb-4">
              <img
                src={tool.logoUrl}
                alt={`${tool.name} logo`}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-semibold text-light-primary truncate group-hover:text-brand-primary transition-colors">
                  {tool.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-light-secondary mt-1">
                  <span className="px-2 py-0.5 rounded-full bg-dark-primary border border-border-dark">
                    {tool.pricingModel}
                  </span>
                  {tool.freeTier && (
                    <span className="px-2 py-0.5 rounded-full bg-green-900/20 border border-green-700/40 text-green-400">
                      Free tier
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <p className="text-sm text-light-secondary line-clamp-2 mb-4">{tool.summary}</p>

            {/* Shared Categories */}
            {sharedCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {sharedCategories.slice(0, 2).map((cat, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-xs px-2 py-1 rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(tool.rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-600'
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm font-semibold text-light-primary">{tool.rating}</span>
            </div>

            {/* Hover Arrow */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg
                className="w-5 h-5 text-brand-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ToolAlternatives;