
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContentGenerator } from '@/components/ai/ContentGenerator';

// Mock fetch
global.fetch = jest.fn();

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ContentGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ providers: [{ name: 'test-provider' }] }),
    });
  });

  it('should render the content generator form', () => {
    render(<ContentGenerator />);

    expect(screen.getByText('AI Content Generator')).toBeInTheDocument();
    expect(screen.getByLabelText('Topic')).toBeInTheDocument();
    expect(screen.getByLabelText('Content Type')).toBeInTheDocument();
  });

  it('should load available providers on mount', async () => {
    render(<ContentGenerator />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/providers');
    });
  });

  it('should generate content successfully', async () => {
    const mockResponse = {
      content: 'Generated blog post content about AI',
      wordCount: 150,
      estimatedReadTime: 1,
      seoScore: 85,
      readabilityScore: 78,
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ providers: [{ name: 'test-provider' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

    render(<ContentGenerator />);

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Topic'), {
      target: { value: 'AI in content creation' },
    });

    // Submit the form
    const generateButton = screen.getByText('Generate Content');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('AI in content creation'),
      });
    });
  });

  it('should add and remove keywords', () => {
    render(<ContentGenerator />);

    const keywordInput = screen.getByPlaceholderText('Type a keyword and press Enter');
    
    // Add keyword
    fireEvent.change(keywordInput, { target: { value: 'AI' } });
    fireEvent.keyDown(keywordInput, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('AI ×')).toBeInTheDocument();

    // Remove keyword
    fireEvent.click(screen.getByText('AI ×'));
    expect(screen.queryByText('AI ×')).not.toBeInTheDocument();
  });

  it('should show validation errors for empty topic', async () => {
    render(<ContentGenerator />);

    const generateButton = screen.getByText('Generate Content');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('String must contain at least 1 character(s)')).toBeInTheDocument();
    });
  });

  it('should display generated content with metrics', async () => {
    const mockResponse = {
      content: 'This is the generated content about AI and machine learning.',
      wordCount: 150,
      estimatedReadTime: 1,
      seoScore: 85,
      readabilityScore: 78,
      tags: ['AI', 'machine learning', 'technology'],
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ providers: [{ name: 'test-provider' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

    const onContentGenerated = jest.fn();
    render(<ContentGenerator onContentGenerated={onContentGenerated} />);

    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Topic'), {
      target: { value: 'AI technology' },
    });

    fireEvent.click(screen.getByText('Generate Content'));

    await waitFor(() => {
      expect(onContentGenerated).toHaveBeenCalledWith(mockResponse);
    });

    // Switch to result tab
    const resultTab = screen.getByText('View Result');
    fireEvent.click(resultTab);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // Word count
      expect(screen.getByText('1m')).toBeInTheDocument(); // Read time
      expect(screen.getByText('85')).toBeInTheDocument(); // SEO score
      expect(screen.getByText('78')).toBeInTheDocument(); // Readability score
    });
  });

  it('should copy content to clipboard', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    const mockResponse = {
      content: 'Generated content to copy',
      wordCount: 50,
      estimatedReadTime: 1,
      seoScore: 80,
      readabilityScore: 75,
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ providers: [{ name: 'test-provider' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

    render(<ContentGenerator />);

    // Generate content first
    fireEvent.change(screen.getByLabelText('Topic'), {
      target: { value: 'Test topic' },
    });
    fireEvent.click(screen.getByText('Generate Content'));

    await waitFor(() => {
      const resultTab = screen.getByText('View Result');
      fireEvent.click(resultTab);
    });

    await waitFor(() => {
      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Generated content to copy');
  });

  it('should handle generation errors gracefully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ providers: [{ name: 'test-provider' }] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    render(<ContentGenerator />);

    fireEvent.change(screen.getByLabelText('Topic'), {
      target: { value: 'Test topic' },
    });

    fireEvent.click(screen.getByText('Generate Content'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/generate', expect.any(Object));
    });
  });
});
