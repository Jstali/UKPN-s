import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DtcFilterDropdown from '../DtcFilterDropdown';

describe('DtcFilterDropdown Date Validation', () => {
  const mockFilters = {
    flow: 'All',
    version: 'All',
    fromRole: 'All',
    fromMPID: 'All',
    toRole: 'All',
    toMPID: 'All',
    sourceApplication: 'All',
    destinationApplication: 'All',
    eventType: 'All',
    receivingApp: 'All',
    eventTimestampFrom: '',
    eventTimestampTo: '',
    fileCreationDate: '',
    publishDate: '',
    fileId: 'All'
  };

  const mockOnFilterChange = jest.fn();
  const mockOnReset = jest.fn();
  const mockOnApply = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows error when From Event Date is later than To Event Date', async () => {
    const filters = {
      ...mockFilters,
      eventTimestampFrom: '2026-04-02T10:00',
      eventTimestampTo: '2026-04-01T10:00'
    };

    render(
      <DtcFilterDropdown
        filters={filters}
        auditData={[]}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        onApply={mockOnApply}
      />
    );

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText(/Event From date cannot be later than Event To date/i)).toBeInTheDocument();
    });
  });

  test('prevents search when date range is invalid', async () => {
    const filters = {
      ...mockFilters,
      eventTimestampFrom: '2026-04-02T10:00',
      eventTimestampTo: '2026-04-01T10:00'
    };

    render(
      <DtcFilterDropdown
        filters={filters}
        auditData={[]}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        onApply={mockOnApply}
      />
    );

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockOnApply).not.toHaveBeenCalled();
    });
  });

  test('allows search when date range is valid', async () => {
    const filters = {
      ...mockFilters,
      eventTimestampFrom: '2026-04-01T10:00',
      eventTimestampTo: '2026-04-02T10:00'
    };

    render(
      <DtcFilterDropdown
        filters={filters}
        auditData={[]}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        onApply={mockOnApply}
      />
    );

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockOnApply).toHaveBeenCalled();
    });
  });

  test('allows search when dates are not provided', () => {
    render(
      <DtcFilterDropdown
        filters={mockFilters}
        auditData={[]}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        onApply={mockOnApply}
      />
    );

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    expect(mockOnApply).toHaveBeenCalled();
  });

  test('clears error when dates are corrected', async () => {
    const { rerender } = render(
      <DtcFilterDropdown
        filters={{
          ...mockFilters,
          eventTimestampFrom: '2026-04-02T10:00',
          eventTimestampTo: '2026-04-01T10:00'
        }}
        auditData={[]}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        onApply={mockOnApply}
      />
    );

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText(/Event From date cannot be later than Event To date/i)).toBeInTheDocument();
    });

    // Fix the dates
    rerender(
      <DtcFilterDropdown
        filters={{
          ...mockFilters,
          eventTimestampFrom: '2026-04-01T10:00',
          eventTimestampTo: '2026-04-02T10:00'
        }}
        auditData={[]}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        onApply={mockOnApply}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/Event From date cannot be later than Event To date/i)).not.toBeInTheDocument();
    });
  });

  test('keeps entered values when validation fails', async () => {
    const filters = {
      ...mockFilters,
      eventTimestampFrom: '2026-04-02T10:00',
      eventTimestampTo: '2026-04-01T10:00'
    };

    render(
      <DtcFilterDropdown
        filters={filters}
        auditData={[]}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
        onApply={mockOnApply}
      />
    );

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText(/Event From date cannot be later than Event To date/i)).toBeInTheDocument();
    });

    // Values should still be in the inputs
    const dateInputs = screen.getAllByDisplayValue('2026-04-02');
    expect(dateInputs.length).toBeGreaterThan(0);
  });
});
