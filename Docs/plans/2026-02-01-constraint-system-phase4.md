# Constraint System Phase 4: Coincident Constraints

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add coincident constraints that snap line endpoints together when they're close.

**Approach:** When a line endpoint is drawn near another endpoint (within 0.5 units), show a ghost coincident indicator. User clicks to confirm, and the solver merges the points.

---

## Task 1: Add CoincidentEquation to Backend Solver

**Files:**
- Modify: `serverpy/app/src/constraint_equations.py`

**Step 1: Add CoincidentEquation class**

Add after VerticalEquation class:

```python
class CoincidentEquation(ConstraintEquation):
    """
    Coincident constraint: point A = point B
    Creates TWO equations: x_a - x_b = 0 AND y_a - y_b = 0
    This class handles one coordinate (x or y).
    """
    def __init__(self, constraint_id: str, element1_id: str, point1_index: int,
                 element2_id: str, point2_index: int, coordinate: str):
        super().__init__(constraint_id, 'coincident')
        self.coordinate = coordinate  # 'x' or 'y'

        # Build variable names based on point index (0=start, 1=end)
        suffix1 = '1' if point1_index == 0 else '2'
        suffix2 = '1' if point2_index == 0 else '2'

        self.var_a = f"{element1_id}_{coordinate}{suffix1}"
        self.var_b = f"{element2_id}_{coordinate}{suffix2}"

    def error(self, variables: Dict[str, float]) -> float:
        return variables[self.var_a] - variables[self.var_b]

    def jacobian(self, variables: Dict[str, float]) -> Dict[str, float]:
        return {
            self.var_a: 1.0,
            self.var_b: -1.0,
        }
```

**Step 2: Update build_equations for coincident**

Add to the build_equations function:

```python
elif constraint_type == 'coincident':
    if len(element_ids) != 2:
        continue
    point_indices = c.get('point_indices', [0, 0])
    if len(point_indices) != 2:
        continue
    # Create two equations: one for X, one for Y
    equations.append(CoincidentEquation(
        constraint_id, element_ids[0], point_indices[0],
        element_ids[1], point_indices[1], 'x'
    ))
    equations.append(CoincidentEquation(
        f"{constraint_id}_y", element_ids[0], point_indices[0],
        element_ids[1], point_indices[1], 'y'
    ))
```

**Step 3: Commit**

```bash
git add serverpy/app/src/constraint_equations.py
git commit -m "feat(constraints): add CoincidentEquation for point merging"
```

---

## Task 2: Add Coincident Constraint Tests

**Files:**
- Modify: `serverpy/app/src/test_constraint_solver.py`

**Step 1: Add test for coincident constraint**

```python
def test_coincident_constraint():
    """Test that coincident constraint merges two endpoints."""
    from constraint_solver import ConstraintSolver

    solver = ConstraintSolver()

    # Two lines: line1 ends at (10,0), line2 starts at (11,1)
    elements = {
        'line1': {'x1': 0, 'y1': 0, 'x2': 10, 'y2': 0},
        'line2': {'x1': 11, 'y1': 1, 'x2': 20, 'y2': 1}
    }

    # Constrain line1 end (index 1) to coincide with line2 start (index 0)
    constraints = [
        {
            'id': 'c1',
            'type': 'coincident',
            'element_ids': ['line1', 'line2'],
            'point_indices': [1, 0]  # line1.end = line2.start
        }
    ]

    result = solver.solve(constraints, elements)

    assert result.success, f"Solver failed: {result.error}"

    # Check that the points are now coincident
    new_line1 = result.updated_elements['line1']
    new_line2 = result.updated_elements['line2']

    # line1's end should equal line2's start
    assert abs(new_line1['x2'] - new_line2['x1']) < 0.01, \
        f"X not coincident: {new_line1['x2']} vs {new_line2['x1']}"
    assert abs(new_line1['y2'] - new_line2['y1']) < 0.01, \
        f"Y not coincident: {new_line1['y2']} vs {new_line2['y1']}"

    print("✅ test_coincident_constraint passed")
    return True
```

**Step 2: Add test to main()**

Add `test_coincident_constraint` to the tests list.

**Step 3: Run tests**

```bash
python3 serverpy/app/src/test_constraint_solver.py
```

**Step 4: Commit**

```bash
git add serverpy/app/src/test_constraint_solver.py
git commit -m "test(constraints): add coincident constraint test"
```

---

## Task 3: Add Coincident Detection to Frontend Inference

**Files:**
- Modify: `client/src/lib/cad/constraints/constraint-inference.ts`

**Step 1: Add coincident detection function**

Add to the file:

```typescript
// Distance threshold for coincident detection (in sketch units)
const COINCIDENT_THRESHOLD = 0.5;

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
```

**Step 2: Update index.ts exports**

Add to exports:

```typescript
export {
    detectCoincidentConstraints,
    getPointPosition,
    type CoincidentCandidate
} from './constraint-inference';
```

**Step 3: Commit**

```bash
git add client/src/lib/cad/constraints/constraint-inference.ts
git add client/src/lib/cad/constraints/index.ts
git commit -m "feat(constraints): add coincident point detection"
```

---

## Task 4: Add Coincident Icon Rendering

**Files:**
- Modify: `client/src/lib/cad/constraints/constraint-renderer.ts`

**Step 1: Update ConstraintIcon interface**

Update to support coincident type:

```typescript
interface ConstraintIcon {
    id: string;
    type: 'horizontal' | 'vertical' | 'coincident';
    elementId: string;
    element2Id?: string;  // For coincident: second element
    pointIndex?: 0 | 1;   // For coincident: which point
    point2Index?: 0 | 1;  // For coincident: second point
    sketchId: string;
    isConfirmed: boolean;
    group: THREE.Group;
}
```

**Step 2: Add renderCoincidentIcon method**

```typescript
/**
 * Render a coincident constraint icon (filled circle) at the point location.
 */
public renderCoincidentIcon(
    id: string,
    elementId: string,
    element2Id: string,
    pointIndex: 0 | 1,
    point2Index: 0 | 1,
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

    const color = isConfirmed ? CONSTRAINT_COLOR_CONFIRMED : CONSTRAINT_COLOR_GHOST;
    const opacity = isConfirmed ? CONSTRAINT_OPACITY_CONFIRMED : CONSTRAINT_OPACITY_GHOST;

    // Create filled circle sprite for coincident
    const sprite = this.createCoincidentSprite(color, opacity, isConfirmed);
    sprite.position.copy(position3D);
    sprite.position.addScaledVector(normal, 0.3);
    group.add(sprite);

    // Hit test mesh
    const hitMesh = this.createHitTestMesh(position3D, normal, id);
    group.add(hitMesh);

    this.scene.add(group);
    this.icons.set(id, {
        id,
        type: 'coincident',
        elementId,
        element2Id,
        pointIndex,
        point2Index,
        sketchId,
        isConfirmed,
        group
    });
}

private createCoincidentSprite(
    color: number,
    opacity: number,
    isConfirmed: boolean
): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const size = 48;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Filled circle
    ctx.fillStyle = isConfirmed ? 'rgba(80, 200, 120, 0.9)' : 'rgba(74, 158, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = isConfirmed ? '#50C878' : '#4A9EFF';
    ctx.lineWidth = 3;
    if (!isConfirmed) {
        ctx.setLineDash([4, 3]);
    }
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 6, 0, Math.PI * 2);
    ctx.fill();

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
    sprite.scale.set(0.8, 0.8, 1);  // Smaller than H/V icons
    sprite.userData.isConstraintIcon = true;

    return sprite;
}
```

**Step 3: Commit**

```bash
git add client/src/lib/cad/constraints/constraint-renderer.ts
git commit -m "feat(constraints): add coincident icon rendering"
```

---

## Task 5: Update ConstraintManager for Coincident

**Files:**
- Modify: `client/src/lib/cad/constraints/constraint-manager.ts`

**Step 1: Add element storage**

Add property to store element endpoints:

```typescript
// Store element endpoints for coincident detection
private elementEndpoints = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();
```

**Step 2: Add method to set element endpoints**

```typescript
/**
 * Store element endpoints for coincident detection.
 */
public setElementEndpoints(
    elementId: string,
    x1: number, y1: number, x2: number, y2: number
): void {
    this.elementEndpoints.set(elementId, { x1, y1, x2, y2 });
}
```

**Step 3: Update detectConstraintsForLine to include coincident**

Update the method to also detect coincident constraints:

```typescript
import { detectLineConstraints, detectCoincidentConstraints, lineMidpoint2D, getPointPosition, InferredConstraint, CoincidentCandidate } from './constraint-inference';

// In detectConstraintsForLine, after H/V detection:

// Also detect coincident constraints
const coincidentCandidates = detectCoincidentConstraints(
    elementId, x1, y1, x2, y2,
    this.elementEndpoints,
    sketchId
);

// Render ghost icons for coincident candidates
for (const candidate of coincidentCandidates) {
    const ghostId = `ghost_coinc_${++this.ghostIdCounter}_${Date.now()}`;

    // Get position of the point on the new element
    const pointPos = getPointPosition(x1, y1, x2, y2, candidate.point1Index);
    const position3D = coords.origin.clone()
        .addScaledVector(coords.uAxis, pointPos.x)
        .addScaledVector(coords.vAxis, pointPos.y);

    this.renderer.renderCoincidentIcon(
        ghostId,
        candidate.element1Id,
        candidate.element2Id,
        candidate.point1Index,
        candidate.point2Index,
        sketchId,
        position3D,
        coords.normal,
        false
    );

    this.ghostConstraints.set(ghostId, {
        ...candidate,
        ghostId,
        confidence: 1 - (candidate.distance / 0.5)  // Closer = higher confidence
    } as any);

    console.log(`Created ghost coincident constraint: ${ghostId}`);
}

// Store this element's endpoints for future detection
this.elementEndpoints.set(elementId, { x1, y1, x2, y2 });
```

**Step 4: Update confirmConstraint for coincident type**

Update the confirmConstraint method to handle coincident:

```typescript
// In confirmConstraint, check ghost type:
const ghostType = (ghost as any).type;

if (ghostType === 'coincident') {
    const coincGhost = ghost as CoincidentCandidate & { ghostId: string };
    const result = await this.callbacks.onConstraintCreate(
        coincGhost.sketchId,
        'coincident',
        [coincGhost.element1Id, coincGhost.element2Id],
        undefined,
        [coincGhost.point1Index, coincGhost.point2Index]  // point_indices
    );
    // ... rest of confirmation logic
}
```

**Step 5: Commit**

```bash
git add client/src/lib/cad/constraints/constraint-manager.ts
git commit -m "feat(constraints): add coincident detection and management"
```

---

## Task 6: Update Callbacks for Point Indices

**Files:**
- Modify: `client/src/lib/cad/constraints/constraint-manager.ts`
- Modify: `client/src/components/cad-application.tsx`

**Step 1: Update callback interface**

```typescript
export interface ConstraintManagerCallbacks {
    onConstraintCreate?: (
        sketchId: string,
        type: string,
        elementIds: string[],
        value?: number,
        pointIndices?: number[]  // NEW: for coincident constraints
    ) => Promise<{ constraint_id: string; updated_elements: any[] }>;
    // ... other callbacks
}
```

**Step 2: Update CADApplication callback**

```typescript
onConstraintCreate: async (sketchId, type, elementIds, value, pointIndices) => {
    if (!clientRef.current) throw new Error('No client');
    const result = await clientRef.current.createConstraint(
        sketchId,
        type,
        elementIds,
        value,
        pointIndices  // Pass point indices
    );
    return {
        constraint_id: result.constraint.id,
        updated_elements: result.updated_elements
    };
},
```

**Step 3: Update CAD client createConstraint method**

```typescript
public async createConstraint(
    sketchId: string,
    type: string,
    elementIds: string[],
    value?: number,
    pointIndices?: number[]  // NEW
): Promise<{ constraint: any; updated_elements: any[] }> {
    const response = await fetch(`${this.baseUrl}/api/v1/constraints`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': this.sessionId,
        },
        body: JSON.stringify({
            session_id: this.sessionId,
            sketch_id: sketchId,
            type,
            element_ids: elementIds,
            value,
            point_indices: pointIndices,  // NEW
        }),
    });
    // ...
}
```

**Step 4: Commit**

```bash
git add client/src/lib/cad/constraints/constraint-manager.ts
git add client/src/components/cad-application.tsx
git add client/src/lib/cad/api/cad-client.ts
git commit -m "feat(constraints): add point_indices support for coincident"
```

---

## Task 7: Wire Up Element Endpoints in CADApplication

**Files:**
- Modify: `client/src/components/cad-application.tsx`

**Step 1: Update onElementVisualization callback**

After setting element data for dimension manager, also set for constraint manager:

```typescript
// Track line data for dimension manager and constraints
if (data.element_type === 'line' && data.parameters_2d) {
    const { x1, y1, x2, y2 } = data.parameters_2d;
    if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
        // For dimension manager
        rendererRef.current?.getDimensionManager().setElementData(
            data.element_id,
            data.sketch_id,
            x1, y1, x2, y2
        );

        // For constraint manager (coincident detection)
        rendererRef.current?.getConstraintManager().setElementEndpoints(
            data.element_id,
            x1, y1, x2, y2
        );

        // Detect H/V and coincident constraints for newly drawn lines
        rendererRef.current?.detectConstraintsForLine(
            data.element_id,
            data.sketch_id,
            x1, y1, x2, y2
        );
    }
}
```

**Step 2: Commit**

```bash
git add client/src/components/cad-application.tsx
git commit -m "feat(constraints): wire up element endpoints for coincident detection"
```

---

## Task 8: Update Documentation

**Files:**
- Modify: `Docs/known-issues.md`

**Step 1: Update constraint system status**

```markdown
### 6. Constraint System - Phase 4 Complete

**Status:** In Progress

Phases 1-4 of the constraint system are implemented:
- ✅ Backend constraint solver (Newton-Raphson)
- ✅ Length, horizontal, vertical, coincident constraints
- ✅ API endpoints for constraint CRUD
- ✅ Dimension integration (Phase 2)
- ✅ H/V constraint inference and UI (Phase 3)
- ✅ Coincident constraint inference and UI (Phase 4)
- ⏳ Phase 5: Perpendicular/Parallel constraints

See `Docs/plans/2026-02-01-constraint-system-design.md` for full design.
```

**Step 2: Commit**

```bash
git add Docs/known-issues.md Docs/plans/2026-02-01-constraint-system-phase4.md
git commit -m "docs: update constraint system status to Phase 4"
```

---

## Summary

After completing all 8 tasks, Phase 4 provides:

1. **Backend solver** - CoincidentEquation merges two points
2. **Frontend detection** - Finds endpoints within 0.5 units of each other
3. **Visual indicator** - Filled circle icon at coincident point location
4. **Ghost → confirmed flow** - Same as H/V constraints
5. **Point indices** - Tracks which endpoint (start/end) of each line

The workflow is:
1. User draws a line with endpoint near an existing endpoint
2. Ghost coincident icon appears at that point
3. User clicks icon → constraint confirmed → points snap together
4. Or user presses Escape → ghost dismissed

**Next Phase:** Perpendicular/Parallel Constraints (angle relationships)
