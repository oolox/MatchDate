import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DropdownSelect } from './DropdownSelect';

const OPTIONS = [
  { value: 'sys-a', label: 'Default' },
  { value: 'sys-b', label: 'Writer' },
];

describe('DropdownSelect', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders a combobox with the selected label', () => {
    render(
      <DropdownSelect
        aria-label="System prompt"
        options={OPTIONS}
        value="sys-a"
        onChange={() => {}}
      />,
    );

    const select = screen.getByRole('combobox', { name: 'System prompt' });
    expect(select).toBeInTheDocument();
    expect(select).toHaveTextContent('Default');
    expect(select).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('option', { name: 'Writer' })).not.toBeInTheDocument();
  });

  it('opens a token-styled listbox and notifies on change', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DropdownSelect
        aria-label="System prompt"
        options={OPTIONS}
        value="sys-a"
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'System prompt' }));
    expect(screen.getByRole('combobox', { name: 'System prompt' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('option', { name: 'Default' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('option', { name: 'Writer' }));
    expect(onChange).toHaveBeenCalledWith('sys-b');
    expect(screen.queryByRole('option', { name: 'Writer' })).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(
      <DropdownSelect
        aria-label="System prompt"
        options={OPTIONS}
        value="sys-a"
        onChange={() => {}}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'System prompt' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('forwards disabled', () => {
    render(
      <DropdownSelect
        aria-label="System prompt"
        options={OPTIONS}
        value="sys-a"
        disabled
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('combobox', { name: 'System prompt' })).toBeDisabled();
  });

  it('renders a trigger icon to the left of the selected label', () => {
    render(
      <DropdownSelect
        aria-label="Asset type"
        icon="tag"
        options={[{ value: 'all', label: 'ALL' }]}
        value="all"
        onChange={() => {}}
      />,
    );

    const select = screen.getByRole('combobox', { name: 'Asset type' });
    expect(select.querySelector('svg')).toBeTruthy();
    expect(select).toHaveTextContent('ALL');
  });

  it('renders per-option icons in the menu', async () => {
    const user = userEvent.setup();
    render(
      <DropdownSelect
        aria-label="Asset type"
        options={[
          { value: 'all', label: 'ALL', icon: 'tag' },
          { value: 'image', label: 'IMAGE', icon: 'tag' },
        ]}
        value="all"
        onChange={() => {}}
      />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Asset type' }));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]?.querySelectorAll('svg').length).toBeGreaterThan(0);
  });
});
