/**
 * Graph storage exports
 */

export { GraphStore } from './store';
export { PostgresGraphStore, graphStore } from './postgres';
export { MemoryGraphStore, memoryStore } from './memory';

// Helper to get the appropriate store based on environment
export function getGraphStore() {
  // Use memory store if no database is configured
  if (!process.env.POSTGRES_URL) {
    console.warn('No Postgres URL configured, using in-memory store');
    return require('./memory').memoryStore;
  }

  return require('./postgres').graphStore;
}
