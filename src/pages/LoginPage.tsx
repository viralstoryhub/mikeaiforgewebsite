
import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsLoading(true);
    setError('');
    try {
      await auth.login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to log in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 animate-fade-in-up">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-light-primary">Welcome Back</h1>
        <p className="text-light-secondary">Log in to access the AI Forge.</p>
      </div>
      <form onSubmit={handleSubmit} className="p-8 bg-dark-secondary rounded-lg border border-border-dark space-y-6 shadow-lg">
        {error && <p className="p-3 bg-red-900/40 text-red-300 rounded-md text-sm">{error}</p>}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-light-secondary">Email Address</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-light-secondary">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 bg-dark-primary border border-border-dark rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary text-light-primary"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Logging In...' : 'Log In'}
        </button>
        <p className="text-center text-sm text-light-secondary">
          Don't have an account? <Link to="/signup" className="font-medium text-brand-primary hover:underline">Sign up</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
