import * as THREE from 'three';

/**
 * Calculate the length of a line segment
 */
export function lineLength(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the midpoint of a line segment
 */
export function lineMidpoint(x1: number, y1: number, x2: number, y2: number): { x: number; y: number } {
    return {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2
    };
}

/**
 * Calculate the unit direction vector of a line
 */
export function lineDirection(x1: number, y1: number, x2: number, y2: number): { x: number; y: number } {
    const length = lineLength(x1, y1, x2, y2);
    if (length === 0) return { x: 1, y: 0 };
    return {
        x: (x2 - x1) / length,
        y: (y2 - y1) / length
    };
}

/**
 * Calculate perpendicular vector (rotated 90 degrees counterclockwise)
 */
export function perpendicularVector(dx: number, dy: number): { x: number; y: number } {
    return { x: -dy, y: dx };
}

/**
 * Resize a line symmetrically around its midpoint to a new length
 */
export function resizeLineSymmetric(
    x1: number, y1: number, x2: number, y2: number,
    newLength: number
): { x1: number; y1: number; x2: number; y2: number } {
    const mid = lineMidpoint(x1, y1, x2, y2);
    const dir = lineDirection(x1, y1, x2, y2);
    const half = newLength / 2;

    return {
        x1: mid.x - dir.x * half,
        y1: mid.y - dir.y * half,
        x2: mid.x + dir.x * half,
        y2: mid.y + dir.y * half
    };
}

/**
 * Calculate dimension visualization positions
 * Returns positions for extension lines and dimension text
 */
export function calculateDimensionPositions(
    x1: number, y1: number, x2: number, y2: number,
    offset: number, offsetDirection: 1 | -1
): {
    extStart1: { x: number; y: number };
    extEnd1: { x: number; y: number };
    extStart2: { x: number; y: number };
    extEnd2: { x: number; y: number };
    dimLineStart: { x: number; y: number };
    dimLineEnd: { x: number; y: number };
    textPosition: { x: number; y: number };
} {
    const dir = lineDirection(x1, y1, x2, y2);
    const perp = perpendicularVector(dir.x, dir.y);
    const perpOffset = {
        x: perp.x * offset * offsetDirection,
        y: perp.y * offset * offsetDirection
    };

    // Small gap between element and extension line start
    const gap = 0.5;
    const gapOffset = { x: perp.x * gap * offsetDirection, y: perp.y * gap * offsetDirection };

    return {
        // Extension line 1 (from point 1)
        extStart1: { x: x1 + gapOffset.x, y: y1 + gapOffset.y },
        extEnd1: { x: x1 + perpOffset.x, y: y1 + perpOffset.y },
        // Extension line 2 (from point 2)
        extStart2: { x: x2 + gapOffset.x, y: y2 + gapOffset.y },
        extEnd2: { x: x2 + perpOffset.x, y: y2 + perpOffset.y },
        // Dimension line (parallel to element, at offset distance)
        dimLineStart: { x: x1 + perpOffset.x, y: y1 + perpOffset.y },
        dimLineEnd: { x: x2 + perpOffset.x, y: y2 + perpOffset.y },
        // Text position (midpoint of dimension line)
        textPosition: {
            x: (x1 + x2) / 2 + perpOffset.x,
            y: (y1 + y2) / 2 + perpOffset.y
        }
    };
}
