import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyzeCSVData } from '../../services/geminiService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import PersonaSelector from '../../components/PersonaSelector';

const FREE_TIER_LIMIT = 3;
const UTILITY_SLUG = 'csv-data-visualizer';
const STORAGE_KEY = `formState_${UTILITY_SLUG}`;

interface DataAnalysisResult {
  summary: string;
  keyInsights: string[];
  trends: string[];
  recommendations: string[];
  chartSuggestions: Array<{
    type: string;
    title: string;
    description: string;
  }>;
}

const CSVDataVisualizer: React.FC = () => {
  const [csvData, setCsvData] = useState('');
  const [question, setQuestion] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('default');
  const [results, setResults] = useState<DataAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();
  const auth = useAuth();

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const { csvData: savedCSV, question: savedQuestion } = JSON.parse(savedState);
        setCsvData(savedCSV || '');
        setQuestion(savedQuestion || '');
      }
    } catch (err) {
      console.error("Failed to parse form state from localStorage", err);
    }
  }, []);

  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({ csvData, question });
      localStorage.setItem(STORAGE_KEY, stateToSave);
    } catch (err) {
       console.error("Failed to save form state to localStorage", err);
    }
  }, [csvData, question]);

  const usage = auth?.currentUser?.utilityUsage?.[UTILITY_SLUG] || 0;
  const remainingUses = FREE_TIER_LIMIT - usage;
  const isFreeTier = auth?.currentUser?.subscriptionTier === 'Free';
  const limitReached = isFreeTier && remainingUses <= 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvData(text);
        addToast('CSV file loaded successfully!', 'success');
      };
      reader.onerror = () => {
        setError('Failed to read file. Please try again.');
        addToast('Failed to read file', 'error');
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (limitReached) {
      addToast("You have reached your free limit for this utility.", 'error');
      return;
    }
    
    if (!csvData.trim() || csvData.trim().length < 50) {
      setError('Please upload a CSV file or paste CSV data (at least 50 characters).');
      return;
    }

    setError(null);
    setIsLoading(true);
    setResults(null);
    
    try {
      const selectedPersona = auth?.currentUser?.personas?.find(p => p.id === selectedPersonaId);
      const systemInstruction = selectedPersona ? selectedPersona.description : undefined;

      const generatedResults = await analyzeCSVData(csvData, question, systemInstruction);
      setResults(generatedResults);
      
      if (auth?.currentUser && auth.recordUtilityUsage) {
        await auth.recordUtilityUsage(UTILITY_SLUG);
      }
      localStorage.removeItem(STORAGE_KEY);
      addToast('Data analysis complete!', 'success');
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while analyzing data. Please try again.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard!', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center space-x-3 mb-6">
        <svg className="w-8 h-8 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h1 className="text-3xl font-bold text-light-primary">CSV Data Visualizer</h1>
      </div>
      <p className="mb-6 text-light-secondary">Upload or paste CSV data to get AI-powered insights, trends analysis, and visualization recommendations.</p>
      
      <form onSubmit={handleSubmit} className="p-6 bg-dark-secondary rounded-lg border border-border-dark space-y-4">
        <div>
          <label className="block text-sm font-medium text-light-secondary mb-2">Upload CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-light-secondary
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-brand-primary file:text-white
              hover:file:opacity-90 file:cursor-pointer
              cursor-pointer"
          />
        </div>

        <div className="text-center text-light-secondary">OR</div>

        <div>
          <label htmlFor="csv_data" className="block text-sm font-medium text-light-secondary">Paste CSV Data</label>
          <textarea
            id="csv_data"
            rows={10}
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="Paste your CSV data here (e.g., Name,Age,Score&#10;John,25,85&#10;Jane,30,92)"
            className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary font-mono text-sm"
          />
        </div>

        <div>
          <label htmlFor="question" className="block text-sm font-medium text-light-secondary">
            Specific Question (Optional)
          </label>
          <input
            type="text"
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What trends do you see in sales data?"
            className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
          />
        </div>

        <div>
          <PersonaSelector selectedPersonaId={selectedPersonaId} onChange={setSelectedPersonaId} />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <div className="pt-2">
          {isFreeTier && (
            <div className="text-sm text-center text-gray-500 mb-4">
              {limitReached ? (
                <p>
                  You've reached your free limit. 
                  <Link to="/dashboard" className="font-semibold text-brand-primary hover:underline ml-1">
                    Upgrade to Pro
                  </Link> 
                  {' '}for unlimited uses.
                </p>
              ) : (
                <p>
                  You have <strong>{remainingUses}</strong> of {FREE_TIER_LIMIT} free uses remaining.
                </p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading || limitReached}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Analyzing Data...' : 'Analyze Data'}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="mt-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          <p className="mt-2 text-light-secondary">AI is analyzing your data...</p>
        </div>
      )}

      {results && (
        <div className="mt-8 space-y-6">
          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">Data Summary</h2>
            <div className="group relative p-4 bg-dark-primary rounded-md">
              <p className="text-light-secondary whitespace-pre-wrap">{results.summary}</p>
              <button 
                onClick={() => handleCopyToClipboard(results.summary)} 
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-600"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">Key Insights</h2>
            <ul className="space-y-2">
              {results.keyInsights.map((insight, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-brand-primary mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-light-secondary">{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">Trends</h2>
            <ul className="space-y-2">
              {results.trends.map((trend, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-light-secondary">{trend}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">Visualization Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.chartSuggestions.map((chart, index) => (
                <div key={index} className="p-4 bg-dark-primary rounded-lg border border-border-dark">
                  <h3 className="font-bold text-light-primary mb-1">{chart.type}</h3>
                  <p className="text-sm text-brand-primary mb-2">{chart.title}</p>
                  <p className="text-xs text-light-secondary">{chart.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-dark-secondary rounded-lg border border-border-dark">
            <h2 className="text-xl font-bold mb-3 text-light-primary">Recommendations</h2>
            <ul className="space-y-2">
              {results.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-light-secondary">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CSVDataVisualizer;