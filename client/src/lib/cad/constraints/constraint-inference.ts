/**
 * Constraint inference detects when a line is near-horizontal or near-vertical,
 * and when line endpoints are near each other (coincident).
 * Returns suggested constraint types based on angle and distance thresholds.
 */

// Angle threshold in degrees for H/V detection
const ANGLE_THRESHOLD_DEGREES = 2;
const ANGLE_THRESHOLD_RADIANS = (ANGLE_THRESHOLD_DEGREES * Math.PI) / 180;

// Distance threshold for coincident detection (in sketch units)
const COINCIDENT_THRESHOLD = 0.5;

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

export interface CoincidentCandidate {
    type: 'coincident';
    element1Id: string;
    point1Index: 0 | 1;  // 0 = start, 1 = end
    element2Id: string;
    point2Index: 0 | 1;
    sketchId: string;
    distance: number;  // How close the points are
}

/**
 * Detect if any endpoint of a new line is near endpoints of existing lines.
 *
 * @param newElementId - ID of the newly drawn line
 * @param newX1, newY1, newX2, newY2 - Endpoints of new line
 * @param existingElements - Map of element IDs to their endpoints
 * @param sketchId - ID of the containing sketch
 * @returns Array of coincident candidates
 */
export function detectCoincidentConstraints(
    newElementId: string,
    newX1: number,
    newY1: number,
    newX2: number,
    newY2: number,
    existingElements: Map<string, { x1: number; y1: number; x2: number; y2: number }>,
    sketchId: string
): CoincidentCandidate[] {
    const candidates: CoincidentCandidate[] = [];
    const newPoints = [
        { x: newX1, y: newY1, index: 0 as const },
        { x: newX2, y: newY2, index: 1 as const }
    ];

    existingElements.forEach((endpoints, elementId) => {
        // Skip self
        if (elementId === newElementId) return;

        const existingPoints = [
            { x: endpoints.x1, y: endpoints.y1, index: 0 as const },
            { x: endpoints.x2, y: endpoints.y2, index: 1 as const }
        ];

        // Check each new point against each existing point
        for (const newPt of newPoints) {
            for (const existPt of existingPoints) {
                const dx = newPt.x - existPt.x;
                const dy = newPt.y - existPt.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < COINCIDENT_THRESHOLD && distance > 0.0001) {
                    candidates.push({
                        type: 'coincident',
                        element1Id: newElementId,
                        point1Index: newPt.index,
                        element2Id: elementId,
                        point2Index: existPt.index,
                        sketchId,
                        distance
                    });
                }
            }
        }
    });

    return candidates;
}

/**
 * Get the position of a point on a line.
 */
export function getPointPosition(
    x1: number, y1: number, x2: number, y2: number,
    pointIndex: 0 | 1
): { x: number; y: number } {
    return pointIndex === 0 ? { x: x1, y: y1 } : { x: x2, y: y2 };
}
