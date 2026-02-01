# Constraint System Design

## Overview

A parametric constraint system for the Dimes CAD application that enables geometric relationships between sketch elements. The system uses automatic inference to suggest constraints, a hybrid solver architecture for responsive UX, and integrates with the existing dimension system.

## Scope

**In scope:**
- Constraint types: coincident, horizontal, vertical, perpendicular, parallel
- Integration with existing dimensions (dimensions become length constraints)
- Automatic constraint inference with user confirmation
- Hybrid solver: frontend preview, backend authoritative solving
- Strict conflict handling (reject invalid operations)

**Out of scope (future):**
- Tangent constraints (curves)
- Equal length/radius constraints
- Symmetric constraints
- Concentric constraints
- Angular dimension constraints

## Data Model

### Constraint

```typescript
type ConstraintType =
  | 'length'        // Existing dimensions
  | 'coincident'    // Two points share same position
  | 'horizontal'    // Line parallel to X axis
  | 'vertical'      // Line parallel to Y axis
  | 'perpendicular' // Two lines at 90 degrees
  | 'parallel';     // Two lines same angle

interface Constraint {
  id: string;
  type: ConstraintType;
  sketch_id: string;

  // References (which elements this constrains)
  element_ids: string[];      // 1 for H/V, 2 for perpendicular/parallel
  point_indices?: number[];   // For coincident: which endpoints (0=start, 1=end)

  // Parameters (for length constraints)
  value?: number;             // Length value in mm

  // Solver state
  satisfied: boolean;

  // For inference UI
  inferred?: boolean;         // Was this auto-detected?
  confirmed?: boolean;        // Has user accepted it?
}
```

### Sketch Extension

```typescript
interface Sketch {
  // ... existing fields
  constraints: Constraint[];
}
```

### Solve Result

```typescript
interface SolveResult {
  success: boolean;
  updated_elements?: SketchElement[];
  error?: {
    type: 'over_constrained' | 'conflicting' | 'unsolvable';
    conflicting_constraints: string[];
    message: string;
  };
}
```

## Constraint Inference System

When the user draws or modifies geometry, the frontend detects near-constraint conditions and suggests them.

### Detection Thresholds

| Constraint | Condition |
|------------|-----------|
| Horizontal | Line angle within 2 degrees of X axis |
| Vertical | Line angle within 2 degrees of Y axis |
| Perpendicular | Angle between lines within 2 degrees of 90 |
| Parallel | Angle difference within 2 degrees |
| Coincident | Points within 0.5 units (snap threshold) |

### Inference Flow

1. User finishes drawing a line (pointer up)
2. Frontend runs `detectInferredConstraints(element)`:
   - Check if line is near-horizontal or near-vertical
   - Check if endpoints are near other endpoints (coincident)
   - Check angles against existing lines (perpendicular/parallel)
3. Matching constraints appear as ghost indicators (dashed blue icons)
4. User clicks icon to confirm, or presses Escape to dismiss
5. Confirmed constraints are sent to backend and become permanent

### Visual Indicators

| Constraint | Icon | Placement |
|------------|------|-----------|
| Horizontal | H | On line midpoint |
| Vertical | V | On line midpoint |
| Perpendicular | Right angle symbol | At intersection |
| Parallel | Double bars | Between lines |
| Coincident | Filled circle | At merged point |

Inferred (unconfirmed) constraints render as dashed/transparent. Confirmed constraints render solid.

## Solver Architecture

### Frontend (TypeScript) - Preview & Validation

```typescript
class ConstraintPreview {
  // Fast checks during drag operations
  wouldViolate(proposedChange: GeometryChange): ConstraintViolation[];

  // Snap suggestions during drawing
  suggestSnap(point: Point2D, constraints: Constraint[]): Point2D;

  // Real-time constraint status
  checkSatisfied(constraint: Constraint, elements: SketchElement[]): boolean;
}
```

The frontend doesn't solve - it only detects violations and suggests snaps. This keeps it fast for 60fps drag feedback.

### Backend (Python) - Authoritative Solver

```python
class ConstraintSolver:
    def solve(self, sketch: Sketch) -> SolveResult:
        """
        Iterative solver using Newton-Raphson method.
        Returns updated element positions or error if unsolvable.
        """

    def validate_change(self, sketch: Sketch, change: GeometryChange) -> bool:
        """Check if proposed change maintains all constraints."""

    def add_constraint(self, sketch: Sketch, constraint: Constraint) -> SolveResult:
        """Add constraint and re-solve. Reject if over-constrained."""
```

### Solve Strategy

1. Build equation system from constraints (each constraint = 1+ equations)
2. Use iterative solver (Newton-Raphson) to find positions satisfying all equations
3. If no solution after 50 iterations, reject the operation
4. Return updated geometry positions to frontend

### Constraint Equations

| Constraint | Equations |
|------------|-----------|
| Length | `sqrt((x2-x1)^2 + (y2-y1)^2) = value` |
| Horizontal | `y2 - y1 = 0` |
| Vertical | `x2 - x1 = 0` |
| Coincident | `x_a - x_b = 0`, `y_a - y_b = 0` |
| Perpendicular | `(dx1 * dx2) + (dy1 * dy2) = 0` |
| Parallel | `(dx1 * dy2) - (dy1 * dx2) = 0` |

## API Endpoints

### Create Constraint

```
POST /api/v1/constraints
Body: {
  sketch_id: string,
  type: ConstraintType,
  element_ids: string[],
  point_indices?: number[],
  value?: number
}
Response: {
  success: boolean,
  data: {
    constraint: Constraint,
    updated_elements: SketchElementVisualizationData[],
    solve_status: 'solved' | 'already_satisfied'
  }
}
```

### Delete Constraint

```
DELETE /api/v1/constraints/:id
Response: { success: boolean }
```

### Update Constraint (for length constraints)

```
PUT /api/v1/constraints/:id
Body: { value: number }
Response: {
  success: boolean,
  data: {
    constraint: Constraint,
    updated_elements: SketchElementVisualizationData[]
  }
}
```

### Validate Change

```
POST /api/v1/constraints/validate
Body: {
  sketch_id: string,
  proposed_change: {
    element_id: string,
    new_values: { x1?, y1?, x2?, y2?, ... }
  }
}
Response: {
  valid: boolean,
  violations: ConstraintViolation[]
}
```

## Data Flow

### Adding a Constraint

1. User confirms inferred constraint (clicks ghost icon)
2. Frontend calls `POST /api/v1/constraints`
3. Backend adds constraint to sketch, runs solver
4. If solvable: returns updated element positions
5. Frontend updates geometry via existing `elementVisualizationCallback`
6. Constraint indicator becomes solid (confirmed)

### Dragging Constrained Geometry

1. User starts dragging a line endpoint
2. Frontend's `ConstraintPreview` shows violations in real-time (red highlights)
3. On pointer up, frontend calls `POST /api/v1/constraints/validate`
4. If valid: apply change. If invalid: revert and show error message.

### Editing a Dimension (Length Constraint)

1. User double-clicks dimension, enters new value
2. Frontend calls `PUT /api/v1/constraints/:id` with new value
3. Backend runs solver to find new geometry positions
4. Updated elements returned and rendered

## Error Handling

### Over-Constrained Detection

When adding a constraint would over-constrain the sketch, the backend rejects with:

```json
{
  "success": false,
  "error": {
    "type": "over_constrained",
    "conflicting_constraints": ["constraint-123", "constraint-456"],
    "message": "Cannot add horizontal: conflicts with existing perpendicular constraint on Line-2"
  }
}
```

### User Feedback

- Status bar shows error message
- Conflicting constraints flash red briefly
- Operation is rejected, geometry unchanged

### Edge Cases

| Case | Behavior |
|------|----------|
| Deleting constrained element | Delete all constraints referencing it. Show confirmation. |
| Circular dependencies | Solver detects and rejects with "unsolvable loop" error. |
| Numerical instability | Reject after 50 iterations with "too complex" message. |
| Zero-length line | Reject length constraints that would make length <= 0. |
| Coincident creates overlap | Allow (valid geometry), warn if full overlap. |

## File Structure

### New Files

```
client/src/lib/cad/
├── constraints/
│   ├── constraint-manager.ts    # CRUD, state, integrates with DimensionManager
│   ├── constraint-preview.ts    # Frontend validation & snap suggestions
│   ├── constraint-renderer.ts   # Three.js icons (H, V, perpendicular, parallel, coincident)
│   └── constraint-inference.ts  # Detect near-constraint conditions

shared/types/
└── constraints.ts               # Constraint, ConstraintType, SolveResult

serverpy/app/src/
├── constraint_solver.py         # Newton-Raphson solver
└── constraint_equations.py      # Equation builders per constraint type
```

### Files to Modify

```
client/src/lib/cad/
├── dimensions/dimension-manager.ts  # Refactor: dimensions become length constraints
├── controls/cad-controls.ts         # Add constraint confirmation UI handlers
├── api/cad-client.ts                # Add constraint API methods

serverpy/app/src/
├── api_server.py                    # Add constraint endpoints
├── geometry_engine.py               # Store constraints in Sketch class

client/src/components/
└── cad-application.tsx              # Constraint state, keyboard shortcuts
```

## Implementation Phases

### Phase 1: Foundation (Backend Solver)
- Add `Constraint` data model to shared types
- Implement `ConstraintSolver` in Python with Newton-Raphson
- Add constraint storage to `Sketch` class
- Create `/api/v1/constraints` endpoints
- Unit tests for solver with simple cases

### Phase 2: Dimension Migration
- Refactor `DimensionManager` to use `ConstraintManager`
- Dimensions become length constraints internally
- Verify existing dimension functionality still works
- Dimension edits now go through solver

### Phase 3: Horizontal/Vertical Constraints
- Add inference detection for near-H/V lines
- Add constraint icons to `ConstraintRenderer`
- Implement ghost to confirmed UI flow
- Frontend validation during drag

### Phase 4: Coincident Constraints
- Detect endpoints near other endpoints
- Render coincident point indicators
- Handle point merging in solver

### Phase 5: Perpendicular/Parallel
- Detect angle relationships between lines
- Add two-element constraint UI
- Complete the core geometric set

## Migration Path

The existing `DimensionManager` and `LinearDimension` continue to work during migration. The new `ConstraintManager` wraps them, treating dimensions as length constraints internally. No breaking changes to current functionality until Phase 2 is complete and tested.
