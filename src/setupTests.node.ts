// Setup for Node.js test environment
// Node.js 18+ has built-in fetch

// Ensure fetch is available globally
if (!globalThis.fetch) {
  console.warn('Fetch not available in this Node.js version. Please upgrade to Node.js 18+');
}