import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock scrollIntoView which is not implemented in jsdom
Element.prototype.scrollIntoView = vi.fn();
