
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Seo from '../components/Seo';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { BookmarkIcon, CheckIcon } from '../components/icons/UtilityIcons';
import ToolAlternatives from '../components/ToolAlternatives';

const XIcon: React.FC = () => (
    <svg className="w-5 h-5 text-red-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ToolDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { tools, loading } = useData();
  const tool = tools.find(t => t.slug === slug);
  const auth = useAuth();

  if (loading) {
     return <div className="text-center py-20">Loading tool...</div>;
  }

  if (!tool) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold">Tool Not Found</h1>
        <p className="mt-4">We couldn't find the tool you were looking for.</p>
        <Link to="/tools" className="mt-6 inline-block bg-brand-primary text-white font-semibold px-6 py-2 rounded-lg">
          Back to Directory
        </Link>
      </div>
    );
  }

  const isSaved = auth?.currentUser?.savedTools?.includes(tool.id) || false;
  const handleSaveToggle = () => {
    if (auth?.toggleSaveTool) {
      auth.toggleSaveTool(tool.id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <Seo
        title={`${tool.name} — review, pros/cons | Mike’s AI Forge`}
        description={tool.summary}
        image={tool.logoUrl}
        canonicalPath={`/tools/${tool.slug}`}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: tool.name,
            description: tool.summary,
            applicationCategory: "AI Tool",
            operatingSystem: "Web",
            image: tool.logoUrl,
            url: tool.websiteUrl,
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: tool.rating,
              bestRating: 5,
              worstRating: 1,
              reviewCount: 1
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Tools", item: `${window.location.origin}/#/tools` },
              { "@type": "ListItem", position: 2, name: tool.name, item: `${window.location.origin}/#/tools/${tool.slug}` }
            ]
          }
        ]}
      />
      <Link to="/tools" className="text-sm font-semibold text-brand-primary hover:underline mb-6 inline-block">&larr; Back to Directory</Link>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-6 mb-8 relative">
        <img src={tool.logoUrl} alt={`${tool.name} logo`} className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold text-light-primary">{tool.name}</h1>
          <p className="mt-2 text-lg text-light-secondary">{tool.summary}</p>
          <div className="flex items-center gap-4 mt-4">
            <a href={tool.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-brand-primary font-semibold hover:underline">
              Visit Website
              <svg className="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
            {auth?.currentUser && (
                <button 
                  onClick={handleSaveToggle}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-light-secondary hover:text-brand-primary"
                >
                  <BookmarkIcon className="w-5 h-5" filled={isSaved} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Verdict */}
      <div className="bg-dark-secondary p-6 rounded-lg border border-border-dark mb-8">
        <h2 className="text-2xl font-bold text-light-primary">Mike's Verdict</h2>
        <p className="mt-2 text-light-secondary">{tool.verdict}</p>
      </div>

      {/* YouTube Review */}
      {tool.youtubeReviewId && (
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-light-primary mb-4">Video Review</h2>
            <div className="aspect-w-16 aspect-h-9">
                 <iframe 
                    className="w-full h-full rounded-lg shadow-lg"
                    src={`https://www.youtube.com/embed/${tool.youtubeReviewId}`}
                    title={`YouTube video player for ${tool.name}`}
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen>
                </iframe>
            </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-bold mb-4 text-light-primary">Pros & Cons</h3>
          <div className="space-y-3">
            {tool.pros.map((pro, i) => (
              <div key={`pro-${i}`} className="flex items-start space-x-3">
                <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p>{pro}</p>
              </div>
            ))}
            {tool.cons.map((con, i) => (
              <div key={`con-${i}`} className="flex items-start space-x-3">
                <XIcon />
                <p>{con}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-xl font-bold mb-4 text-light-primary">Quickstart Guide</h3>
          <ol className="list-decimal list-inside space-y-3">
            {tool.quickstart.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </div>
      </div>

      {/* Similar Tools */}
      <ToolAlternatives currentTool={tool} allTools={tools} maxItems={3} />
    </div>
  );
};

export default ToolDetailPage;
