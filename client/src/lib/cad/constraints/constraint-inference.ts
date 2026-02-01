/**
 * Constraint inference detects when a line is near-horizontal or near-vertical.
 * Returns suggested constraint types based on angle thresholds.
 */

// Angle threshold in degrees for H/V detection
const ANGLE_THRESHOLD_DEGREES = 2;
const ANGLE_THRESHOLD_RADIANS = (ANGLE_THRESHOLD_DEGREES * Math.PI) / 180;

export interface InferredConstraint {
    type: 'horizontal' | 'vertical';
    elementId: string;
    sketchId: string;
    confidence: number; // 0-1, how close to perfect alignment
}

/**
 * Detect if a line is near-horizontal or near-vertical.
 *
 * @param x1, y1 - Start point of line (2D sketch coords)
 * @param x2, y2 - End point of line (2D sketch coords)
 * @param elementId - ID of the line element
 * @param sketchId - ID of the containing sketch
 * @returns Array of inferred constraints (could be empty, or have H or V)
 */
export function detectLineConstraints(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    elementId: string,
    sketchId: string
): InferredConstraint[] {
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Avoid division by zero for zero-length lines
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 0.0001) {
        return [];
    }

    const results: InferredConstraint[] = [];

    // Check horizontal (dy should be near zero)
    const horizontalAngle = Math.abs(Math.atan2(dy, dx));
    const isNearHorizontal = horizontalAngle < ANGLE_THRESHOLD_RADIANS ||
                              Math.abs(horizontalAngle - Math.PI) < ANGLE_THRESHOLD_RADIANS;

    if (isNearHorizontal) {
        // Confidence: 1 at 0 deg, 0 at threshold
        const angleFromHorizontal = Math.min(horizontalAngle, Math.abs(horizontalAngle - Math.PI));
        const confidence = 1 - (angleFromHorizontal / ANGLE_THRESHOLD_RADIANS);

        results.push({
            type: 'horizontal',
            elementId,
            sketchId,
            confidence: Math.max(0, Math.min(1, confidence))
        });
    }

    // Check vertical (dx should be near zero)
    const verticalAngle = Math.abs(Math.atan2(dx, dy));
    const isNearVertical = verticalAngle < ANGLE_THRESHOLD_RADIANS ||
                            Math.abs(verticalAngle - Math.PI) < ANGLE_THRESHOLD_RADIANS;

    if (isNearVertical) {
        const angleFromVertical = Math.min(verticalAngle, Math.abs(verticalAngle - Math.PI));
        const confidence = 1 - (angleFromVertical / ANGLE_THRESHOLD_RADIANS);

        results.push({
            type: 'vertical',
            elementId,
            sketchId,
            confidence: Math.max(0, Math.min(1, confidence))
        });
    }

    return results;
}

/**
 * Check if a line is exactly horizontal (dy = 0).
 */
export function isExactlyHorizontal(y1: number, y2: number): boolean {
    return Math.abs(y2 - y1) < 0.0001;
}

/**
 * Check if a line is exactly vertical (dx = 0).
 */
export function isExactlyVertical(x1: number, x2: number): boolean {
    return Math.abs(x2 - x1) < 0.0001;
}

/**
 * Calculate the midpoint of a line in 2D.
 */
export function lineMidpoint2D(
    x1: number,
    y1: number,
    x2: number,
    y2: number
): { x: number; y: number } {
    return {
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2
    };
}
