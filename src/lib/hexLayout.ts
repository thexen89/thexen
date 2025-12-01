import { HexPosition } from './types';

// Axial coordinate directions for hexagonal grid (pointy-top)
const DIRECTIONS = [
  { q: 1, r: 0 },   // East
  { q: 0, r: 1 },   // Southeast
  { q: -1, r: 1 },  // Southwest
  { q: -1, r: 0 },  // West
  { q: 0, r: -1 },  // Northwest
  { q: 1, r: -1 },  // Northeast
];

/**
 * Generate spiral hex positions from center outward
 * Priority 1 = center, 2-7 = first ring, 8-19 = second ring, etc.
 */
export function generateSpiralPositions(count: number, hexSize: number): HexPosition[] {
  const positions: HexPosition[] = [];

  if (count === 0) return positions;

  // Center hex (priority 1)
  positions.push({
    q: 0,
    r: 0,
    ...axialToPixel(0, 0, hexSize),
  });

  if (count === 1) return positions;

  let ring = 1;
  let positionsGenerated = 1;

  while (positionsGenerated < count) {
    // Start position for this ring: move to (ring, 0) in axial coords
    // Then walk around the ring
    let q = ring;
    let r = 0;

    for (let side = 0; side < 6; side++) {
      for (let step = 0; step < ring; step++) {
        if (positionsGenerated >= count) break;

        const pixel = axialToPixel(q, r, hexSize);
        positions.push({ q, r, ...pixel });
        positionsGenerated++;

        // Move to next position
        q += DIRECTIONS[side].q;
        r += DIRECTIONS[side].r;
      }
      if (positionsGenerated >= count) break;
    }

    ring++;
  }

  return positions;
}

/**
 * Convert axial coordinates to pixel coordinates (pointy-top hexagon)
 */
export function axialToPixel(q: number, r: number, size: number): { x: number; y: number } {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = size * ((3 / 2) * r);
  return { x, y };
}

/**
 * Convert pixel coordinates to axial coordinates
 */
export function pixelToAxial(px: number, py: number, size: number): { q: number; r: number } {
  const q = ((Math.sqrt(3) / 3) * px - (1 / 3) * py) / size;
  const r = ((2 / 3) * py) / size;
  return { q: Math.round(q), r: Math.round(r) };
}

/**
 * Get the vertices of a hexagon at given position
 */
export function getHexVertices(centerX: number, centerY: number, size: number): { x: number; y: number }[] {
  const vertices: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30); // Pointy-top
    vertices.push({
      x: centerX + size * Math.cos(angle),
      y: centerY + size * Math.sin(angle),
    });
  }
  return vertices;
}

/**
 * Check if a point is inside a hexagon
 */
export function isPointInHex(
  px: number,
  py: number,
  hexX: number,
  hexY: number,
  size: number
): boolean {
  // Transform point to hex-local coordinates
  const dx = Math.abs(px - hexX);
  const dy = Math.abs(py - hexY);

  // Quick rejection
  if (dx > size * Math.sqrt(3) / 2 || dy > size) return false;

  // More precise check using hexagon geometry
  return dy <= size && dx <= Math.sqrt(3) * (size - dy / 2) / 2 * 2;
}

/**
 * Calculate hex size based on viewport and desired visible hexes
 */
export function calculateHexSize(viewportWidth: number, viewportHeight: number, targetHexCount: number = 7): number {
  const minDimension = Math.min(viewportWidth, viewportHeight);
  // Target: about 7 hexes visible across the smallest dimension at scale 1
  return minDimension / targetHexCount / 1.5;
}
