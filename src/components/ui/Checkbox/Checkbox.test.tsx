import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a labeled checkbox', () => {
    render(<Checkbox label="Include assets" />);
    expect(screen.getByRole('checkbox', { name: 'Include assets' })).toBeInTheDocument();
  });

  it('toggles checked state when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox label="Include assets" onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Include assets' });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('supports controlled checked state', () => {
    const { rerender } = render(<Checkbox label="Include assets" checked={false} readOnly />);
    expect(screen.getByRole('checkbox', { name: 'Include assets' })).not.toBeChecked();

    rerender(<Checkbox label="Include assets" checked readOnly />);
    expect(screen.getByRole('checkbox', { name: 'Include assets' })).toBeChecked();
  });

  it('uses aria-label when hideLabel is set', () => {
    render(<Checkbox label="Include assets" hideLabel />);
    expect(screen.getByRole('checkbox', { name: 'Include assets' })).toBeInTheDocument();
    expect(screen.queryByText('Include assets')).not.toBeInTheDocument();
  });

  it('forwards disabled', () => {
    render(<Checkbox label="Include assets" disabled />);
    expect(screen.getByRole('checkbox', { name: 'Include assets' })).toBeDisabled();
  });

  it('applies a different class for secondary variant', () => {
    const { rerender } = render(<Checkbox label="Include assets" variant="primary" />);
    const primaryClass = screen.getByRole('checkbox', { name: 'Include assets' }).parentElement
      ?.className;

    rerender(<Checkbox label="Include assets" variant="secondary" />);
    const secondaryClass = screen.getByRole('checkbox', { name: 'Include assets' }).parentElement
      ?.className;

    expect(primaryClass).not.toBe(secondaryClass);
  });
});
