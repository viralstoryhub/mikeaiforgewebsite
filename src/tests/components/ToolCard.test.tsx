import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ToolCard from '../../components/ToolCard';
import { AuthContext } from '../../contexts/AuthContext';
import { Tool } from '../../types';

const mockTool: Tool = {
  id: '1',
  slug: 'test-tool',
  name: 'Test Tool',
  summary: 'A test tool',
  websiteUrl: 'https://test.com',
  logoUrl: 'https://test.com/logo.png',
  pricingModel: 'Free',
  freeTier: true,
  rating: 4.5,
  verdict: 'Great tool',
  pros: ['Pro 1', 'Pro 2'],
  cons: ['Con 1'],
  bestFor: 'Testing',
  quickstart: ['Step 1', 'Step 2'],
  categories: ['Testing'],
  tags: ['test'],
};

const mockAuthContext = {
  currentUser: { id: '1', email: 'test@test.com', savedTools: [] },
  toggleSaveTool: vi.fn(),
};

describe('ToolCard', () => {
  it('renders tool information correctly', () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext as any}>
          <ToolCard tool={mockTool} />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    expect(screen.getByText('Test Tool')).toBeInTheDocument();
    expect(screen.getByText('A test tool')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('calls toggleSaveTool when bookmark button is clicked', () => {
    render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext as any}>
          <ToolCard tool={mockTool} />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    const bookmarkButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(bookmarkButton);

    expect(mockAuthContext.toggleSaveTool).toHaveBeenCalledWith('1');
  });
});