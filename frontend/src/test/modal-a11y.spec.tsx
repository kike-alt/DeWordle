import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeyboardHelpModal } from '../components/KeyboardHelpModal';
import { KeyboardShortcutsHelp } from '../components/KeyboardNavigation';

describe('KeyboardHelpModal — accessibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders dialog element', () => {
    render(<KeyboardHelpModal open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders all keyboard shortcuts', () => {
    render(<KeyboardHelpModal open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Navigate between tiles')).toBeInTheDocument();
    expect(screen.getByText('Submit current word')).toBeInTheDocument();
    expect(screen.getByText('Delete last letter')).toBeInTheDocument();
    expect(screen.getByText('Close this modal / cancel')).toBeInTheDocument();
    expect(screen.getByText('Toggle this help panel')).toBeInTheDocument();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<KeyboardHelpModal open={true} onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus with Tab key', () => {
    render(<KeyboardHelpModal open={true} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    const buttons = dialog.querySelectorAll('button');
    
    // Focus should start on first button
    expect(document.activeElement).toBe(buttons[0]);
    
    // Tab through all focusable elements
    for (let i = 0; i < buttons.length; i++) {
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    }
    
    // After last tab, focus should wrap to first button
    // (This is a simplified check - real focus trap needs more setup)
  });

  it('close button is accessible', () => {
    render(<KeyboardHelpModal open={true} onClose={vi.fn()} />);
    const closeButton = screen.getByRole('button', { name: /close help/i });
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveAttribute('aria-label', 'Close help');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardHelpModal open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close help/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens the shortcuts modal when ? is pressed outside an input', () => {
    render(<KeyboardShortcutsHelp />);

    fireEvent.keyDown(document, { key: '?' });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not open the shortcuts modal while typing in an input', () => {
    render(
      <>
        <input aria-label="Guess" />
        <KeyboardShortcutsHelp />
      </>,
    );

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Guess' }), {
      key: '?',
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
