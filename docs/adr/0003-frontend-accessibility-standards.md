# ADR 0003: Frontend Accessibility Standards

## Status
Accepted

## Context
DeWordle's frontend is a Next.js 15 application using Radix UI primitives and Tailwind CSS. The game interface relies heavily on visual feedback (color-based letter states in the Wordle grid). Users who rely on screen readers, keyboard navigation, or have low vision need semantic markup, ARIA annotations, and visible focus indicators to use the application effectively. WCAG 2.1 AA is the target compliance level.

## Decision
1. Implement WCAG 2.1 AA compliance across all user-facing pages.
2. Add ARIA live regions (`aria-live="polite"` and `aria-live="assertive"`) to announce game state changes (new guesses, letter reveals, game completion).
3. Implement focus trapping in modal dialogs (LoginModal, any future modals) so keyboard focus stays within the modal when open.
4. Add a visible "Skip to content" link as the first focusable element in the layout, targeting the main content area.
5. Ensure all interactive elements have visible focus indicators (`focus-visible:ring-2` or equivalent) that meet the 3:1 contrast ratio requirement.
6. Use `role="grid"` and `role="gridcell"` with descriptive `aria-label` attributes on the game board, providing text alternatives for each cell's letter and status.
7. Provide a `tabIndex={-1}` on the main content container so the skip link can move focus there programmatically.
8. Create reusable accessibility utilities in `src/lib/accessibility.ts` for focus management, screen reader announcements, and keyboard navigation helpers.

## Consequences
- Keyboard-only users can navigate the entire application without a mouse.
- Screen reader users receive real-time game state updates through ARIA live regions.
- Visual focus indicators satisfy WCAG 2.4.7 (Focus Visible) and 2.4.11 (Focus Appearance).
- The skip-to-content link satisfies WCAG 2.4.1 (Bypass Blocks).
- Modal focus trapping prevents focus from escaping into background content (WCAG 2.4.3 Focus Order).
- No impact on visual design for users who do not require accessibility features.

## Migration Notes
- See [Frontend Wallet Foundation](../FRONTEND_WALLET_FOUNDATION.md) for frontend architecture context.
- New component `AccessibleGameBoard.tsx` provides an accessible alternative to inline game board rendering.
- Existing UI components (`button.tsx`) updated with `focus-visible` classes.
