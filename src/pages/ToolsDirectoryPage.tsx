
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import ToolCard from '../components/ToolCard';
import { ToolCardSkeleton } from '../components/Skeletons';
import Pagination from '../components/Pagination';
import { toArray } from '../utils/toArray';
import { Tool } from '../types';
import Seo from '../components/Seo';

const ITEMS_PER_PAGE = 6;

const ToolsDirectoryPage: React.FC = () => {
  const { tools, loading: isLoading } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  console.log('[ToolsDirectoryPage] isLoading:', isLoading);
  console.log('[ToolsDirectoryPage] tools:', tools);
  console.log('[ToolsDirectoryPage] tools type:', typeof tools, Array.isArray(tools));

  const categories = useMemo(() => {
    const toolsArray = toArray<Tool>(tools);
    if (toolsArray.length === 0) return ['All'];
    const allCategories = toolsArray.flatMap(tool => tool.categories);
    return ['All', ...Array.from(new Set(allCategories))];
  }, [tools]);

  const filteredTools = useMemo(() => {
    const toolsArray = toArray<Tool>(tools);
    if (toolsArray.length === 0) return [];
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return toolsArray.filter(tool => {
      const matchesSearch = tool.name.toLowerCase().includes(lowercasedSearchTerm) ||
                            tool.summary.toLowerCase().includes(lowercasedSearchTerm) ||
                            tool.tags.some(tag => tag.toLowerCase().includes(lowercasedSearchTerm));
      const matchesCategory = selectedCategory === 'All' || tool.categories.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, tools]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredTools.length / ITEMS_PER_PAGE);

  const paginatedTools = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const result = filteredTools.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    console.log('[ToolsDirectoryPage] filteredTools length:', filteredTools.length);
    console.log('[ToolsDirectoryPage] paginatedTools length:', result.length);
    console.log('[ToolsDirectoryPage] paginatedTools:', result);
    return result;
  }, [currentPage, filteredTools]);


  return (
    <div className="animate-fade-in-up">
      <Seo
        title="AI Tools Directory | Mike’s AI Forge"
        description="Search and filter Mike’s hand-picked AI tools."
        canonicalPath="/tools"
      />
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-light-primary sm:text-5xl">AI Tools Directory</h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-light-secondary sm:mt-4">
          Search and filter through Mike's hand-picked collection of top-tier AI tools.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search by name, summary, or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border-dark rounded-md bg-dark-secondary text-light-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-border-dark rounded-md bg-dark-secondary text-light-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Tools Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <ToolCardSkeleton key={index} />
          ))}
        </div>
      ) : paginatedTools.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedTools.map((tool, index) => (
              <div key={tool.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms`}}>
                <ToolCard tool={tool} />
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-12">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold text-light-secondary">No tools found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
};

export default ToolsDirectoryPage;
