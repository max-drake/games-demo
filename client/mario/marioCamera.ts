/**
 * marioCamera.ts
 * Horizontal scrolling camera for Super Mario World.
 *
 * The camera tracks Mario's X position, keeping him centered at CANVAS_W / 2.
 * It is clamped so the viewport never scrolls past the left edge of the level
 * (cameraX >= 0) nor reveals black void beyond the right edge
 * (cameraX <= levelWidthInTiles * TILE_SIZE - CANVAS_W).
 *
 * There is no vertical scrolling — this is a flat, horizontally-scrolling world.
 *
 * All four exported functions are pure (no side effects, no global state).
 */

import { CANVAS_W, TILE_SIZE } from './marioConstants'

// ─── Camera update ────────────────────────────────────────────────────────────

/**
 * Compute a new cameraX so Mario stays centered horizontally in the viewport,
 * clamped to the valid range `[0, levelWidthPx - CANVAS_W]`.
 *
 * @param currentCamera  The current camera X offset (pixels).  Used to
 *                       enforce the "no scrolling back left" invariant.
 * @param marioX         Mario's world-space X coordinate (left edge, pixels).
 * @param levelWidthInTiles  Width of the level in tiles.
 * @returns              New cameraX (pixels), clamped to level bounds.
 */
export function updateCamera(
  currentCamera: number,
  marioX: number,
  levelWidthInTiles: number,
): number {
  // Desired camera position: place Mario at the horizontal center of the screen.
  const desired = marioX - CANVAS_W / 2

  // Maximum scroll: stop when the right edge of the level aligns with the
  // right edge of the viewport.
  const maxCamera = levelWidthInTiles * TILE_SIZE - CANVAS_W

  // Clamp to [0, max].  When max is negative (level narrower than the canvas)
  // we clamp to 0 so the level is left-aligned and nothing looks broken.
  const clamped = Math.max(0, Math.min(desired, Math.max(0, maxCamera)))

  // The camera never scrolls backward past whatever it has already revealed.
  // (SMW-style: you can't see areas you've passed.)
  return Math.max(currentCamera, clamped)
}

// ─── Coordinate transforms ────────────────────────────────────────────────────

/**
 * Convert a world-space X coordinate to a screen-space X coordinate.
 *
 * @param worldX   X position in the level (pixels from the left edge of the level).
 * @param cameraX  Current camera X offset.
 * @returns        X position in screen space (pixels from the left edge of the canvas).
 */
export function worldToScreen(worldX: number, cameraX: number): number {
  return worldX - cameraX
}

/**
 * Convert a screen-space X coordinate to a world-space X coordinate.
 *
 * @param screenX  X position on the canvas (pixels from the left edge).
 * @param cameraX  Current camera X offset.
 * @returns        X position in the level (pixels from the left edge of the level).
 */
export function screenToWorld(screenX: number, cameraX: number): number {
  return screenX + cameraX
}

// ─── Visibility culling ───────────────────────────────────────────────────────

/**
 * Returns `true` if a world-space axis-aligned bounding box (AABB) is at
 * least partially visible within the current viewport.
 *
 * An object is considered visible when its screen-space extent overlaps the
 * range `[0, CANVAS_W]`.  Objects that are entirely off either edge —
 * further than their own width beyond the canvas boundary — return `false`.
 *
 * @param worldX   Left edge of the object in world space (pixels).
 * @param width    Width of the object (pixels).
 * @param cameraX  Current camera X offset.
 * @returns        `true` if the object overlaps the visible canvas strip.
 */
export function isVisible(worldX: number, width: number, cameraX: number): boolean {
  const screenX = worldToScreen(worldX, cameraX)
  // Object is entirely off the right side of the canvas.
  if (screenX >= CANVAS_W) return false
  // Object is entirely off the left side of the canvas.
  if (screenX + width <= 0) return false
  return true
}
