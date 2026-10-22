import '@testing-library/jest-dom/vitest';

// jsdom has no viewport; browser checks exercise real route scrolling.
window.scrollTo = vi.fn()
