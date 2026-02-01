# Constraint System Phase 5: Perpendicular/Parallel Constraints

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add perpendicular and parallel constraints that enforce angle relationships between two lines.

**Approach:** When a line is drawn at approximately 90 degrees (perpendicular) or 0 degrees (parallel) to an existing line, show ghost constraint indicators. User clicks to confirm, and the solver enforces the angle relationship.

---

## Task 1: Add PerpendicularEquation and ParallelEquation to Backend Solver

**Files:**
- Modify: `serverpy/app/src/constraint_equations.py`

**Step 1: Add PerpendicularEquation class**

Add after CoincidentEquation class:

```python
class PerpendicularEquation(ConstraintEquation):
    """
    Perpendicular constraint: two lines at 90 degrees.
    Equation: (dx1 * dx2) + (dy1 * dy2) = 0 (dot product = 0)

    Where dx1 = line1.x2 - line1.x1, etc.
    """
    def __init__(self, constraint_id: str, element1_id: str, element2_id: str):
        super().__init__(constraint_id, 'perpendicular')
        self.element1_id = element1_id
        self.element2_id = element2_id

        # Variable names for both elements
        self.x1_1 = f"{element1_id}_x1"
        self.y1_1 = f"{element1_id}_y1"
        self.x2_1 = f"{element1_id}_x2"
        self.y2_1 = f"{element1_id}_y2"

        self.x1_2 = f"{element2_id}_x1"
        self.y1_2 = f"{element2_id}_y1"
        self.x2_2 = f"{element2_id}_x2"
        self.y2_2 = f"{element2_id}_y2"

    def error(self, variables: Dict[str, float]) -> float:
        dx1 = variables[self.x2_1] - variables[self.x1_1]
        dy1 = variables[self.y2_1] - variables[self.y1_1]
        dx2 = variables[self.x2_2] - variables[self.x1_2]
        dy2 = variables[self.y2_2] - variables[self.y1_2]

        # Dot product should be 0 for perpendicular lines
        return dx1 * dx2 + dy1 * dy2

    def jacobian(self, variables: Dict[str, float]) -> Dict[str, float]:
        dx1 = variables[self.x2_1] - variables[self.x1_1]
        dy1 = variables[self.y2_1] - variables[self.y1_1]
        dx2 = variables[self.x2_2] - variables[self.x1_2]
        dy2 = variables[self.y2_2] - variables[self.y1_2]

        # d(error)/d(x) for each variable
        return {
            self.x1_1: -dx2,  # d(dx1*dx2)/d(x1_1) = -dx2
            self.y1_1: -dy2,  # d(dy1*dy2)/d(y1_1) = -dy2
            self.x2_1: dx2,   # d(dx1*dx2)/d(x2_1) = dx2
            self.y2_1: dy2,   # d(dy1*dy2)/d(y2_1) = dy2
            self.x1_2: -dx1,  # d(dx1*dx2)/d(x1_2) = -dx1
            self.y1_2: -dy1,
            self.x2_2: dx1,
            self.y2_2: dy1,
        }
```

**Step 2: Add ParallelEquation class**

```python
class ParallelEquation(ConstraintEquation):
    """
    Parallel constraint: two lines with same angle.
    Equation: (dx1 * dy2) - (dy1 * dx2) = 0 (cross product = 0)

    Where dx1 = line1.x2 - line1.x1, etc.
    """
    def __init__(self, constraint_id: str, element1_id: str, element2_id: str):
        super().__init__(constraint_id, 'parallel')
        self.element1_id = element1_id
        self.element2_id = element2_id

        self.x1_1 = f"{element1_id}_x1"
        self.y1_1 = f"{element1_id}_y1"
        self.x2_1 = f"{element1_id}_x2"
        self.y2_1 = f"{element1_id}_y2"

        self.x1_2 = f"{element2_id}_x1"
        self.y1_2 = f"{element2_id}_y1"
        self.x2_2 = f"{element2_id}_x2"
        self.y2_2 = f"{element2_id}_y2"

    def error(self, variables: Dict[str, float]) -> float:
        dx1 = variables[self.x2_1] - variables[self.x1_1]
        dy1 = variables[self.y2_1] - variables[self.y1_1]
        dx2 = variables[self.x2_2] - variables[self.x1_2]
        dy2 = variables[self.y2_2] - variables[self.y1_2]

        # Cross product should be 0 for parallel lines
        return dx1 * dy2 - dy1 * dx2

    def jacobian(self, variables: Dict[str, float]) -> Dict[str, float]:
        dx1 = variables[self.x2_1] - variables[self.x1_1]
        dy1 = variables[self.y2_1] - variables[self.y1_1]
        dx2 = variables[self.x2_2] - variables[self.x1_2]
        dy2 = variables[self.y2_2] - variables[self.y1_2]

        # d(dx1*dy2 - dy1*dx2)/d(x) for each variable
        return {
            self.x1_1: -dy2,  # d(dx1*dy2)/d(x1_1) = -dy2
            self.y1_1: dx2,   # d(-dy1*dx2)/d(y1_1) = dx2
            self.x2_1: dy2,   # d(dx1*dy2)/d(x2_1) = dy2
            self.y2_1: -dx2,  # d(-dy1*dx2)/d(y2_1) = -dx2
            self.x1_2: dy1,   # d(-dy1*dx2)/d(x1_2) = dy1
            self.y1_2: -dx1,  # d(dx1*dy2)/d(y1_2) = -dx1
            self.x2_2: -dy1,  # d(-dy1*dx2)/d(x2_2) = -dy1
            self.y2_2: dx1,   # d(dx1*dy2)/d(y2_2) = dx1
        }
```

**Step 3: Update build_equations for perpendicular and parallel**

Add to the build_equations function:

```python
elif constraint_type == 'perpendicular':
    if len(element_ids) != 2:
        continue
    equations.append(PerpendicularEquation(
        constraint_id, element_ids[0], element_ids[1]
    ))

elif constraint_type == 'parallel':
    if len(element_ids) != 2:
        continue
    equations.append(ParallelEquation(
        constraint_id, element_ids[0], element_ids[1]
    ))
```

**Step 4: Commit**

```bash
git add serverpy/app/src/constraint_equations.py
git commit -m "feat(constraints): add Perpendicular and Parallel equations"
```

---

## Task 2: Add Perpendicular/Parallel Constraint Tests

**Files:**
- Modify: `serverpy/app/src/test_constraint_solver.py`

**Step 1: Add test for perpendicular constraint**

```python
def test_perpendicular_constraint():
    """Test that perpendicular constraint makes lines 90 degrees apart."""
    from constraint_solver import ConstraintSolver

    solver = ConstraintSolver()

    # Two lines: line1 is horizontal, line2 is at 45 degrees
    elements = {
        'line1': {'x1': 0, 'y1': 0, 'x2': 10, 'y2': 0},   # Horizontal
        'line2': {'x1': 5, 'y1': 0, 'x2': 10, 'y2': 5}    # 45 degree angle
    }

    constraints = [
        {
            'id': 'c1',
            'type': 'perpendicular',
            'element_ids': ['line1', 'line2']
        }
    ]

    result = solver.solve(constraints, elements)

    assert result.success, f"Solver failed: {result.error}"

    # Check that lines are perpendicular (dot product = 0)
    new_line1 = result.updated_elements['line1']
    new_line2 = result.updated_elements['line2']

    dx1 = new_line1['x2'] - new_line1['x1']
    dy1 = new_line1['y2'] - new_line1['y1']
    dx2 = new_line2['x2'] - new_line2['x1']
    dy2 = new_line2['y2'] - new_line2['y1']

    dot_product = dx1 * dx2 + dy1 * dy2

    assert abs(dot_product) < 0.01, \
        f"Lines not perpendicular: dot product = {dot_product}"

    print("✅ test_perpendicular_constraint passed")
    return True
```

**Step 2: Add test for parallel constraint**

```python
def test_parallel_constraint():
    """Test that parallel constraint makes lines same angle."""
    from constraint_solver import ConstraintSolver

    solver = ConstraintSolver()

    # Two lines at different angles
    elements = {
        'line1': {'x1': 0, 'y1': 0, 'x2': 10, 'y2': 0},   # Horizontal
        'line2': {'x1': 0, 'y1': 5, 'x2': 10, 'y2': 8}    # Slight angle
    }

    constraints = [
        {
            'id': 'c1',
            'type': 'parallel',
            'element_ids': ['line1', 'line2']
        }
    ]

    result = solver.solve(constraints, elements)

    assert result.success, f"Solver failed: {result.error}"

    # Check that lines are parallel (cross product = 0)
    new_line1 = result.updated_elements['line1']
    new_line2 = result.updated_elements['line2']

    dx1 = new_line1['x2'] - new_line1['x1']
    dy1 = new_line1['y2'] - new_line1['y1']
    dx2 = new_line2['x2'] - new_line2['x1']
    dy2 = new_line2['y2'] - new_line2['y1']

    cross_product = dx1 * dy2 - dy1 * dx2

    assert abs(cross_product) < 0.01, \
        f"Lines not parallel: cross product = {cross_product}"

    print("✅ test_parallel_constraint passed")
    return True
```

**Step 3: Add tests to main()**

Add `test_perpendicular_constraint` and `test_parallel_constraint` to the tests list.

**Step 4: Run tests**

```bash
python3 serverpy/app/src/test_constraint_solver.py
```

**Step 5: Commit**

```bash
git add serverpy/app/src/test_constraint_solver.py
git commit -m "test(constraints): add perpendicular and parallel constraint tests"
```

---

## Task 3: Add Perpendicular/Parallel Detection to Frontend Inference

**Files:**
- Modify: `client/src/lib/cad/constraints/constraint-inference.ts`

**Step 1: Add angle relationship detection**

Add to the file:

```typescript
// Angle threshold for perpendicular/parallel detection (in radians)
const ANGLE_THRESHOLD_PERP_PARALLEL = (2 * Math.PI) / 180;  // 2 degrees

export interface AngleConstraintCandidate {
    type: 'perpendicular' | 'parallel';
    element1Id: string;
    element2Id: string;
    sketchId: string;
    angleDifference: number;  // How close to exact (0 for parallel, PI/2 for perp)
}

/**
 * Get the angle of a line in radians.
 */
function getLineAngle(x1: number, y1: number, x2: number, y2: number): number {
    return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Normalize angle to [0, PI) for comparison (lines can point either way).
 */
function normalizeAngle(angle: number): number {
    // Bring to [0, 2*PI)
    let normalized = angle % (2 * Math.PI);
    if (normalized < 0) normalized += 2 * Math.PI;
    // Map to [0, PI) since lines are bidirectional
    if (normalized >= Math.PI) normalized -= Math.PI;
    return normalized;
}

/**
 * Detect if a new line is perpendicular or parallel to existing lines.
 */
export function detectAngleConstraints(
    newElementId: string,
    newX1: number,
    newY1: number,
    newX2: number,
    newY2: number,
    existingElements: Map<string, { x1: number; y1: number; x2: number; y2: number }>,
    sketchId: string
): AngleConstraintCandidate[] {
    const candidates: AngleConstraintCandidate[] = [];

    const newAngle = normalizeAngle(getLineAngle(newX1, newY1, newX2, newY2));

    existingElements.forEach((endpoints, elementId) => {
        if (elementId === newElementId) return;

        const existingAngle = normalizeAngle(
            getLineAngle(endpoints.x1, endpoints.y1, endpoints.x2, endpoints.y2)
        );

        // Angle difference
        let angleDiff = Math.abs(newAngle - existingAngle);
        // Handle wraparound at PI
        if (angleDiff > Math.PI / 2) {
            angleDiff = Math.PI - angleDiff;
        }

        // Check for parallel (angle diff near 0)
        if (angleDiff < ANGLE_THRESHOLD_PERP_PARALLEL) {
            candidates.push({
                type: 'parallel',
                element1Id: newElementId,
                element2Id: elementId,
                sketchId,
                angleDifference: angleDiff
            });
        }

        // Check for perpendicular (angle diff near 90 degrees)
        const perpDiff = Math.abs(angleDiff - Math.PI / 2);
        if (perpDiff < ANGLE_THRESHOLD_PERP_PARALLEL) {
            candidates.push({
                type: 'perpendicular',
                element1Id: newElementId,
                element2Id: elementId,
                sketchId,
                angleDifference: perpDiff
            });
        }
    });

    return candidates;
}

/**
 * Get midpoint between two lines for constraint icon placement.
 */
export function getMidpointBetweenLines(
    line1: { x1: number; y1: number; x2: number; y2: number },
    line2: { x1: number; y1: number; x2: number; y2: number }
): { x: number; y: number } {
    const mid1 = lineMidpoint2D(line1.x1, line1.y1, line1.x2, line1.y2);
    const mid2 = lineMidpoint2D(line2.x1, line2.y1, line2.x2, line2.y2);
    return {
        x: (mid1.x + mid2.x) / 2,
        y: (mid1.y + mid2.y) / 2
    };
}
```

**Step 2: Update index.ts exports**

Add to exports:

```typescript
export {
    detectAngleConstraints,
    getMidpointBetweenLines,
    type AngleConstraintCandidate
} from './constraint-inference';
```

**Step 3: Commit**

```bash
git add client/src/lib/cad/constraints/constraint-inference.ts
git add client/src/lib/cad/constraints/index.ts
git commit -m "feat(constraints): add perpendicular/parallel angle detection"
```

---

## Task 4: Add Perpendicular/Parallel Icon Rendering

**Files:**
- Modify: `client/src/lib/cad/constraints/constraint-renderer.ts`

**Step 1: Update ConstraintIcon interface**

```typescript
interface ConstraintIcon {
    id: string;
    type: 'horizontal' | 'vertical' | 'coincident' | 'perpendicular' | 'parallel';
    elementId: string;
    element2Id?: string;
    pointIndex?: 0 | 1;
    point2Index?: 0 | 1;
    sketchId: string;
    isConfirmed: boolean;
    group: THREE.Group;
}
```

**Step 2: Add renderPerpendicularIcon method**

```typescript
/**
 * Render a perpendicular constraint icon (right angle symbol) between two lines.
 */
public renderPerpendicularIcon(
    id: string,
    elementId: string,
    element2Id: string,
    sketchId: string,
    position3D: THREE.Vector3,
    normal: THREE.Vector3,
    isConfirmed: boolean
): void {
    this.removeIcon(id);

    const group = new THREE.Group();
    group.name = `constraint-${id}`;
    group.userData.constraintId = id;
    group.userData.isConstraint = true;
    group.userData.elementId = elementId;

    const opacity = isConfirmed ? CONSTRAINT_OPACITY_CONFIRMED : CONSTRAINT_OPACITY_GHOST;

    const sprite = this.createPerpendicularSprite(opacity, isConfirmed);
    sprite.position.copy(position3D);
    sprite.position.addScaledVector(normal, 0.3);
    group.add(sprite);

    const hitMesh = this.createHitTestMesh(position3D, normal, id);
    group.add(hitMesh);

    this.scene.add(group);
    this.icons.set(id, {
        id,
        type: 'perpendicular',
        elementId,
        element2Id,
        sketchId,
        isConfirmed,
        group
    });
}

private createPerpendicularSprite(opacity: number, isConfirmed: boolean): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const size = 48;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = isConfirmed ? 'rgba(80, 200, 120, 0.9)' : 'rgba(74, 158, 255, 0.6)';
    ctx.fillRect(4, 4, size - 8, size - 8);

    // Right angle symbol
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    if (!isConfirmed) {
        ctx.setLineDash([4, 3]);
    }

    // Draw L shape
    ctx.beginPath();
    ctx.moveTo(12, 36);
    ctx.lineTo(12, 12);
    ctx.lineTo(36, 12);
    ctx.stroke();

    // Small square in corner
    ctx.strokeRect(12, 12, 8, 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity,
        depthTest: false,
        depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.9, 0.9, 1);
    sprite.userData.isConstraintIcon = true;

    return sprite;
}
```

**Step 3: Add renderParallelIcon method**

```typescript
/**
 * Render a parallel constraint icon (double bars) between two lines.
 */
public renderParallelIcon(
    id: string,
    elementId: string,
    element2Id: string,
    sketchId: string,
    position3D: THREE.Vector3,
    normal: THREE.Vector3,
    isConfirmed: boolean
): void {
    this.removeIcon(id);

    const group = new THREE.Group();
    group.name = `constraint-${id}`;
    group.userData.constraintId = id;
    group.userData.isConstraint = true;
    group.userData.elementId = elementId;

    const opacity = isConfirmed ? CONSTRAINT_OPACITY_CONFIRMED : CONSTRAINT_OPACITY_GHOST;

    const sprite = this.createParallelSprite(opacity, isConfirmed);
    sprite.position.copy(position3D);
    sprite.position.addScaledVector(normal, 0.3);
    group.add(sprite);

    const hitMesh = this.createHitTestMesh(position3D, normal, id);
    group.add(hitMesh);

    this.scene.add(group);
    this.icons.set(id, {
        id,
        type: 'parallel',
        elementId,
        element2Id,
        sketchId,
        isConfirmed,
        group
    });
}

private createParallelSprite(opacity: number, isConfirmed: boolean): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const size = 48;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Background circle
    ctx.fillStyle = isConfirmed ? 'rgba(80, 200, 120, 0.9)' : 'rgba(74, 158, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fill();

    // Double bars (parallel symbol)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    if (!isConfirmed) {
        ctx.setLineDash([4, 3]);
    }

    // Two parallel lines
    ctx.beginPath();
    ctx.moveTo(14, 14);
    ctx.lineTo(34, 34);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(14, 24);
    ctx.lineTo(24, 34);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity,
        depthTest: false,
        depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.9, 0.9, 1);
    sprite.userData.isConstraintIcon = true;

    return sprite;
}
```

**Step 4: Update confirmConstraint to handle new types**

Add to the confirmConstraint method:

```typescript
} else if (icon.type === 'perpendicular') {
    this.renderPerpendicularIcon(
        id,
        icon.elementId,
        icon.element2Id || '',
        icon.sketchId,
        position,
        normal,
        true
    );
} else if (icon.type === 'parallel') {
    this.renderParallelIcon(
        id,
        icon.elementId,
        icon.element2Id || '',
        icon.sketchId,
        position,
        normal,
        true
    );
}
```

**Step 5: Commit**

```bash
git add client/src/lib/cad/constraints/constraint-renderer.ts
git commit -m "feat(constraints): add perpendicular/parallel icon rendering"
```

---

## Task 5: Update ConstraintManager for Perpendicular/Parallel

**Files:**
- Modify: `client/src/lib/cad/constraints/constraint-manager.ts`

**Step 1: Import new detection functions**

Update imports:

```typescript
import { detectLineConstraints, detectCoincidentConstraints, detectAngleConstraints, lineMidpoint2D, getPointPosition, getMidpointBetweenLines, InferredConstraint, CoincidentCandidate, AngleConstraintCandidate } from './constraint-inference';
```

**Step 2: Add ghost angle constraint map**

```typescript
// Track ghost angle constraints (perpendicular/parallel)
private ghostAngleConstraints = new Map<string, AngleConstraintCandidate & { ghostId: string; confidence: number }>();
```

**Step 3: Update detectConstraintsForLine to include angle detection**

Add after coincident detection:

```typescript
// Also detect angle constraints (perpendicular/parallel)
const angleCandidates = detectAngleConstraints(
    elementId, x1, y1, x2, y2,
    this.elementEndpoints,
    sketchId
);

// Render ghost icons for angle candidates
for (const candidate of angleCandidates) {
    const ghostId = `ghost_angle_${++this.ghostIdCounter}_${Date.now()}`;

    // Get position between the two lines
    const newLine = { x1, y1, x2, y2 };
    const existingLine = this.elementEndpoints.get(candidate.element2Id);
    if (!existingLine) continue;

    const midBetween = getMidpointBetweenLines(newLine, existingLine);
    const position3D = coords.origin.clone()
        .addScaledVector(coords.uAxis, midBetween.x)
        .addScaledVector(coords.vAxis, midBetween.y);

    if (candidate.type === 'perpendicular') {
        this.renderer.renderPerpendicularIcon(
            ghostId,
            candidate.element1Id,
            candidate.element2Id,
            sketchId,
            position3D,
            coords.normal,
            false
        );
    } else {
        this.renderer.renderParallelIcon(
            ghostId,
            candidate.element1Id,
            candidate.element2Id,
            sketchId,
            position3D,
            coords.normal,
            false
        );
    }

    this.ghostAngleConstraints.set(ghostId, {
        ...candidate,
        ghostId,
        confidence: 1 - (candidate.angleDifference / ANGLE_THRESHOLD_PERP_PARALLEL)
    });

    console.log(`Created ghost ${candidate.type} constraint: ${ghostId}`);
}
```

**Step 4: Update confirmConstraint for angle constraints**

Add to confirmConstraint:

```typescript
// Check if it's an angle ghost
const angleGhost = this.ghostAngleConstraints.get(ghostId);

// In the try block, add:
} else if (angleGhost) {
    // Perpendicular or parallel constraint
    result = await this.callbacks.onConstraintCreate(
        angleGhost.sketchId,
        angleGhost.type,
        [angleGhost.element1Id, angleGhost.element2Id]
    );

    constraint = {
        id: result.constraint_id,
        type: angleGhost.type,
        sketch_id: angleGhost.sketchId,
        element_ids: [angleGhost.element1Id, angleGhost.element2Id],
        satisfied: true,
        inferred: true,
        confirmed: true
    };

    this.ghostAngleConstraints.delete(ghostId);
}
```

**Step 5: Update dismissAllGhostConstraints**

Add:

```typescript
// Dismiss angle ghosts
this.ghostAngleConstraints.forEach((_, ghostId) => {
    this.renderer.removeIcon(ghostId);
    if (this.callbacks.onConstraintRejected) {
        this.callbacks.onConstraintRejected(ghostId);
    }
});
this.ghostAngleConstraints.clear();
```

**Step 6: Update other methods for angle constraints**

Update `isGhostConstraint`, `getAllGhostIds`, `hasGhostConstraints`, `clearConstraintsForSketch`, `dismissGhostConstraintsForElement`, and `dispose` to include `ghostAngleConstraints`.

**Step 7: Commit**

```bash
git add client/src/lib/cad/constraints/constraint-manager.ts
git commit -m "feat(constraints): add perpendicular/parallel constraint management"
```

---

## Task 6: Update Documentation

**Files:**
- Modify: `Docs/known-issues.md`

**Step 1: Update constraint system status**

```markdown
### 6. Constraint System - Phase 5 Complete

**Status:** Complete

All phases of the core constraint system are implemented:
- ✅ Backend constraint solver (Newton-Raphson)
- ✅ Length, horizontal, vertical, coincident, perpendicular, parallel constraints
- ✅ API endpoints for constraint CRUD
- ✅ Dimension integration (Phase 2)
- ✅ H/V constraint inference and UI (Phase 3)
- ✅ Coincident constraint inference and UI (Phase 4)
- ✅ Perpendicular/Parallel constraint inference and UI (Phase 5)

See `Docs/plans/2026-02-01-constraint-system-design.md` for full design.
```

**Step 2: Commit**

```bash
git add Docs/known-issues.md Docs/plans/2026-02-01-constraint-system-phase5.md
git commit -m "docs: update constraint system status to Phase 5 complete"
```

---

## Summary

After completing all 6 tasks, Phase 5 provides:

1. **Backend solver** - PerpendicularEquation and ParallelEquation with proper jacobians
2. **Frontend detection** - Angle comparison with 2 degree threshold
3. **Visual indicators** - Right angle symbol for perpendicular, double bars for parallel
4. **Ghost → confirmed flow** - Same as other constraints
5. **Two-element constraints** - Relationships between pairs of lines

The workflow is:
1. User draws a line at ~90° or ~0° to an existing line
2. Ghost perpendicular/parallel icon appears between the lines
3. User clicks icon → constraint confirmed → lines snap to exact angle
4. Or user presses Escape → ghost dismissed

**Constraint System Complete!** All core geometric constraints are now implemented:
- Length (via dimensions)
- Horizontal/Vertical
- Coincident
- Perpendicular/Parallel
