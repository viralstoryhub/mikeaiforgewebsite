import React, { useState } from 'react';
import { useUtilityHistory, type HistoryItem } from '../hooks/useUtilityHistory';

interface UtilityHistoryPanelProps {
  utilitySlug: string;
  onRestore?: (item: HistoryItem) => void;
}

export const UtilityHistoryPanel: React.FC<UtilityHistoryPanelProps> = ({
  utilitySlug,
  onRestore,
}) => {
  const { currentUtilityHistory, deleteHistoryItem, clearUtilityHistory } =
    useUtilityHistory(utilitySlug);
  const [isExpanded, setIsExpanded] = useState(false);

  if (currentUtilityHistory.length === 0) {
    return null;
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleCopyOutput = (output: string) => {
    navigator.clipboard.writeText(output);
    // Could add a toast notification here
  };

  return (
    <div className="bg-dark-secondary rounded-xl border border-border-dark p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-brand-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-light-primary">
            Recent History ({currentUtilityHistory.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-brand-primary hover:text-brand-primary/80 transition-colors"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          {currentUtilityHistory.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all history for this utility?')) {
                  clearUtilityHistory(utilitySlug);
                }
              }}
              className="text-xs text-light-secondary hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {(isExpanded
          ? currentUtilityHistory
          : currentUtilityHistory.slice(0, 3)
        ).map((item) => (
          <div
            key={item.id}
            className="bg-dark-primary/50 rounded-lg p-3 border border-border-dark hover:border-brand-primary/30 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-light-secondary flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {formatDate(item.timestamp)}
                </p>
                {item.title && (
                  <p className="text-sm font-medium text-light-primary mt-1 truncate">
                    {item.title}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onRestore && (
                  <button
                    onClick={() => onRestore(item)}
                    className="p-1.5 rounded bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors"
                    title="Restore this result"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleCopyOutput(item.output)}
                  className="p-1.5 rounded bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors"
                  title="Copy output"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => deleteHistoryItem(utilitySlug, item.id)}
                  className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="text-xs text-light-secondary bg-dark-primary/30 rounded p-2 border border-border-dark/50">
              <p className="line-clamp-2 whitespace-pre-wrap">{truncateText(item.output, 150)}</p>
            </div>
          </div>
        ))}

        {!isExpanded && currentUtilityHistory.length > 3 && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full text-xs text-center py-2 text-brand-primary hover:text-brand-primary/80 transition-colors"
          >
            Show {currentUtilityHistory.length - 3} more...
          </button>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border-dark">
        <p className="text-xs text-light-secondary/70 flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          History is saved locally on your device (last 10 results)
        </p>
      </div>
    </div>
  );
};

export default UtilityHistoryPanel;