/**
 * flood-fill.ts
 * Find connected same-colour clusters (BFS) to pop, then remove orphaned bubbles.
 *
 * Re-exports the canonical implementations from floodFill.ts and gravity.ts
 * so callers can import from either location.  New code should prefer this file.
 */

export { findCluster, popCluster } from './floodFill'
export { dropOrphanBubbles, findConnectedToCeiling } from './gravity'
