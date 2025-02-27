import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from '../Dashboard';
import { supabase } from '../../lib/supabase';
import { vi } from 'vitest';

// Mock the supabase client
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn()
  }
}));

// Mock the recharts library
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div>Bar</div>,
  XAxis: () => <div>XAxis</div>,
  YAxis: () => <div>YAxis</div>,
  CartesianGrid: () => <div>CartesianGrid</div>,
  Tooltip: () => <div>Tooltip</div>
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Mock the supabase auth response
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: {
        user: { id: 'test-user-id', email: 'test@example.com' }
      }
    });

    // Mock the supabase queries
    (supabase.from as jest.Mock).mockImplementation((table) => ({
      select: () => ({
        count: vi.fn().mockResolvedValue({ count: 10 }),
        order: () => ({
          data: [
            { created_at: '2024-01-01' },
            { created_at: '2024-02-01' }
          ]
        }),
        not: () => ({
          count: vi.fn().mockResolvedValue({ count: 8 })
        })
      })
    }));
  });

  test('renders dashboard component with loading state', () => {
    render(<Dashboard />);
    expect(screen.getByText('Total Scans')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Active Plants')).toBeInTheDocument();
    expect(screen.getByText('Detected Diseases')).toBeInTheDocument();
  });

  test('displays correct stats after data fetch', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // Total Scans
      expect(screen.getByText('80%')).toBeInTheDocument(); // Success Rate
    });
  });

  test('renders scan activity chart', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Scan Activity')).toBeInTheDocument();
      expect(screen.getByText('Bar')).toBeInTheDocument();
    });
  });

  test('handles error in data fetching', async () => {
    // Mock console.error to prevent error logging during test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: () => {
        throw new Error('Failed to fetch');
      }
    }));

    render(<Dashboard />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching dashboard data:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  test('renders scan history when user is authenticated', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Analysis History')).toBeInTheDocument();
    });
  });

  test('processes activity data correctly', async () => {
    const mockActivityData = [
      { created_at: '2024-01-01T00:00:00Z' },
      { created_at: '2024-01-02T00:00:00Z' },
      { created_at: '2024-02-01T00:00:00Z' }
    ];

    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: () => ({
        order: () => ({
          data: mockActivityData
        })
      })
    }));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Scan Activity')).toBeInTheDocument();
    });
  });
}); 