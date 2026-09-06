import { vi } from 'vite-plus/test'

// Direct assignment so vi.clearAllMocks() in test files cannot clear these.
// vi.spyOn in beforeEach doesn't work: setup.ts beforeEach runs before each
// test file's beforeEach, so clearAllMocks() wipes the spy implementation
// before the test body runs.
console.log = vi.fn()
console.error = vi.fn()
console.warn = vi.fn()
