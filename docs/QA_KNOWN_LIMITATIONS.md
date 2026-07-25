# QA Known Limitations

## Accessibility checks (QA-214 / #811)

The automated tests in `frontend/src/test/accessibility-regression.spec.tsx` cover:

- ARIA role presence (`alert`, `status`, `heading`, `button`)
- Live-region attributes (`aria-live`, `aria-atomic`)
- Accessible labels (`aria-label`, `aria-labelledby`)
- `sr-only` text content for screen-reader announcements
- Keyboard operability via click handlers on focusable elements

### Known manual checks still required

| Check | Reason automated coverage is not sufficient |
|-------|---------------------------------------------|
| Colour contrast ratios | Requires computed CSS evaluation; not available in jsdom |
| Focus-trap inside modals | Real keyboard tab/shift-tab navigation requires a headed browser |
| Screen-reader reading order | Must be verified with real AT (NVDA, VoiceOver, TalkBack) |
| Touch target size (WCAG 2.5.5) | Requires viewport/layout rendering, not available in jsdom |
| Dynamic content insertion ordering | Complex scenarios with concurrent state updates |

### Expanding coverage

To add axe-core integration when the project has a CI browser step:

```bash
# In the frontend directory
npm install --save-dev @axe-core/react axe-core
```

Then import and run in test setup:

```ts
// src/test/setup.ts
import { configureAxe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);
```
