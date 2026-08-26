import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only auto-cleans when `globals: true` puts afterEach on the
// global object. Without this, every render stacks up in the same document and
// queries start reporting "found multiple elements" for the second test on.
afterEach(cleanup);
