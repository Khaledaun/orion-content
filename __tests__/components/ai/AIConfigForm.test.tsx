
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIConfigForm } from '@/components/ai/AIConfigForm';

// Mock fetch
global.fetch = jest.fn();

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('AIConfigForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ providers: [] }),
    });
  });

  it('should render the form correctly', () => {
    render(<AIConfigForm />);

    expect(screen.getByText('AI Provider Configuration')).toBeInTheDocument();
    expect(screen.getByText('Add Provider')).toBeInTheDocument();
    expect(screen.getByText('Manage Providers')).toBeInTheDocument();
  });

  it('should show form fields when adding a provider', () => {
    render(<AIConfigForm />);

    expect(screen.getByLabelText('Provider Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Provider Type')).toBeInTheDocument();
    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Model')).toBeInTheDocument();
  });

  it('should update available models when provider type changes', async () => {
    render(<AIConfigForm />);

    const providerSelect = screen.getByLabelText('Provider Type');
    fireEvent.click(providerSelect);

    const openaiOption = screen.getByText('OpenAI');
    fireEvent.click(openaiOption);

    await waitFor(() => {
      const modelSelect = screen.getByLabelText('Model');
      expect(modelSelect).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' }),
    });

    render(<AIConfigForm />);

    // Fill form
    fireEvent.change(screen.getByLabelText('Provider Name'), {
      target: { value: 'Test OpenAI' },
    });

    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: 'test-api-key' },
    });

    // Submit form
    const submitButton = screen.getByText('Add Provider');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test OpenAI'),
      });
    });
  });

  it('should show validation errors for invalid data', async () => {
    render(<AIConfigForm />);

    // Submit form without filling required fields
    const submitButton = screen.getByText('Add Provider');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Provider name is required')).toBeInTheDocument();
    });
  });

  it('should load and display existing providers', async () => {
    const mockProviders = [
      {
        name: 'OpenAI Production',
        config: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 2000,
          apiKey: 'sk-test...',
        },
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ providers: mockProviders }),
    });

    render(<AIConfigForm />);

    // Switch to manage providers tab
    const manageTab = screen.getByText('Manage Providers');
    fireEvent.click(manageTab);

    await waitFor(() => {
      expect(screen.getByText('OpenAI Production')).toBeInTheDocument();
      expect(screen.getByText('openai')).toBeInTheDocument();
      expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
    });
  });

  it('should test provider configuration', async () => {
    const mockProviders = [
      {
        name: 'Test Provider',
        config: { provider: 'openai', model: 'gpt-4o-mini' },
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ providers: mockProviders }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Test successful' }),
      });

    render(<AIConfigForm />);

    // Switch to manage providers tab
    const manageTab = screen.getByText('Manage Providers');
    fireEvent.click(manageTab);

    await waitFor(() => {
      const testButton = screen.getByText('Test');
      fireEvent.click(testButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai/providers/Test Provider/test',
        { method: 'POST' }
      );
    });
  });

  it('should delete provider', async () => {
    const mockProviders = [
      {
        name: 'Test Provider',
        config: { provider: 'openai', model: 'gpt-4o-mini' },
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ providers: mockProviders }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Deleted' }),
      });

    render(<AIConfigForm />);

    // Switch to manage providers tab
    const manageTab = screen.getByText('Manage Providers');
    fireEvent.click(manageTab);

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('svg')?.getAttribute('data-testid') === 'trash-2'
      );
      
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ai/providers/Test Provider',
        { method: 'DELETE' }
      );
    });
  });
});
