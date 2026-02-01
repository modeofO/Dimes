# Constraint System Phase 1: Backend Solver Foundation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core constraint solver infrastructure in Python that can solve length, horizontal, and vertical constraints.

**Architecture:** Newton-Raphson iterative solver that takes a sketch with constraints and returns updated element positions. Each constraint type maps to one or more equations. The solver minimizes constraint violation iteratively.

**Tech Stack:** Python 3.10, FastAPI, Pydantic, NumPy (for matrix operations)

---

## Task 1: Add Constraint Types to Shared Types

**Files:**
- Create: `shared/types/constraints.ts`
- Modify: `shared/types/geometry.ts` (add import/export)

**Step 1: Create constraint types file**

Create `shared/types/constraints.ts`:

```typescript
export type ConstraintType =
  | 'length'
  | 'coincident'
  | 'horizontal'
  | 'vertical'
  | 'perpendicular'
  | 'parallel';

export interface Constraint {
  id: string;
  type: ConstraintType;
  sketch_id: string;
  element_ids: string[];
  point_indices?: number[];  // For coincident: 0=start, 1=end
  value?: number;            // For length constraints (mm)
  satisfied: boolean;
  inferred?: boolean;
  confirmed?: boolean;
}

export interface SolveResult {
  success: boolean;
  updated_elements?: Array<{
    element_id: string;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    center_x?: number;
    center_y?: number;
  }>;
  error?: {
    type: 'over_constrained' | 'conflicting' | 'unsolvable';
    conflicting_constraints: string[];
    message: string;
  };
}

export interface ConstraintVisualizationData {
  constraint_id: string;
  constraint_type: ConstraintType;
  sketch_id: string;
  element_ids: string[];
  satisfied: boolean;
  icon_position_3d: [number, number, number];
}
```

**Step 2: Export from geometry.ts**

Add to end of `shared/types/geometry.ts`:

```typescript
export * from './constraints';
```

**Step 3: Verify TypeScript compiles**

Run: `cd client && npm run build 2>&1 | head -20`
Expected: No errors related to constraints.ts

**Step 4: Commit**

```bash
git add shared/types/constraints.ts shared/types/geometry.ts
git commit -m "feat(constraints): add constraint type definitions"
```

---

## Task 2: Add NumPy Dependency

**Files:**
- Modify: `serverpy/environment.yml`

**Step 1: Add numpy to environment**

Edit `serverpy/environment.yml`, add numpy to dependencies:

```yaml
  - numpy>=1.24.0
```

Add after the `- pip:` section under pip dependencies or in the conda dependencies list.

**Step 2: Verify environment file is valid YAML**

Run: `cd serverpy && python -c "import yaml; yaml.safe_load(open('environment.yml'))"`
Expected: No output (valid YAML)

**Step 3: Commit**

```bash
git add serverpy/environment.yml
git commit -m "build: add numpy dependency for constraint solver"
```

---

## Task 3: Create Constraint Equations Module

**Files:**
- Create: `serverpy/app/src/constraint_equations.py`

**Step 1: Create the equations module**

Create `serverpy/app/src/constraint_equations.py`:

```python
"""
Constraint equation builders for the Newton-Raphson solver.

Each constraint type provides:
- error(): Returns constraint violation (0 when satisfied)
- jacobian(): Returns partial derivatives for solver
"""
import math
from typing import List, Tuple, Dict, Any
from dataclasses import dataclass


@dataclass
class ConstraintEquation:
    """Represents one equation in the constraint system."""
    constraint_id: str
    constraint_type: str

    def error(self, variables: Dict[str, float]) -> float:
        """Return constraint error (0 = satisfied)."""
        raise NotImplementedError

    def jacobian(self, variables: Dict[str, float]) -> Dict[str, float]:
        """Return partial derivatives w.r.t. each variable."""
        raise NotImplementedError


class LengthEquation(ConstraintEquation):
    """
    Length constraint: sqrt((x2-x1)^2 + (y2-y1)^2) = target_length
    Error = current_length - target_length
    """
    def __init__(self, constraint_id: str, element_id: str, target_length: float):
        super().__init__(constraint_id, 'length')
        self.element_id = element_id
        self.target_length = target_length
        # Variable names for this element
        self.x1_var = f"{element_id}_x1"
        self.y1_var = f"{element_id}_y1"
        self.x2_var = f"{element_id}_x2"
        self.y2_var = f"{element_id}_y2"

    def error(self, variables: Dict[str, float]) -> float:
        x1 = variables[self.x1_var]
        y1 = variables[self.y1_var]
        x2 = variables[self.x2_var]
        y2 = variables[self.y2_var]

        dx = x2 - x1
        dy = y2 - y1
        current_length = math.sqrt(dx * dx + dy * dy)
        return current_length - self.target_length

    def jacobian(self, variables: Dict[str, float]) -> Dict[str, float]:
        x1 = variables[self.x1_var]
        y1 = variables[self.y1_var]
        x2 = variables[self.x2_var]
        y2 = variables[self.y2_var]

        dx = x2 - x1
        dy = y2 - y1
        length = math.sqrt(dx * dx + dy * dy)

        if length < 1e-10:
            return {self.x1_var: 0, self.y1_var: 0, self.x2_var: 0, self.y2_var: 0}

        # d(length)/d(x1) = -dx/length, etc.
        return {
            self.x1_var: -dx / length,
            self.y1_var: -dy / length,
            self.x2_var: dx / length,
            self.y2_var: dy / length,
        }


class HorizontalEquation(ConstraintEquation):
    """
    Horizontal constraint: y2 - y1 = 0
    Error = y2 - y1
    """
    def __init__(self, constraint_id: str, element_id: str):
        super().__init__(constraint_id, 'horizontal')
        self.element_id = element_id
        self.y1_var = f"{element_id}_y1"
        self.y2_var = f"{element_id}_y2"

    def error(self, variables: Dict[str, float]) -> float:
        return variables[self.y2_var] - variables[self.y1_var]

    def jacobian(self, variables: Dict[str, float]) -> Dict[str, float]:
        return {
            self.y1_var: -1.0,
            self.y2_var: 1.0,
        }


class VerticalEquation(ConstraintEquation):
    """
    Vertical constraint: x2 - x1 = 0
    Error = x2 - x1
    """
    def __init__(self, constraint_id: str, element_id: str):
        super().__init__(constraint_id, 'vertical')
        self.element_id = element_id
        self.x1_var = f"{element_id}_x1"
        self.x2_var = f"{element_id}_x2"

    def error(self, variables: Dict[str, float]) -> float:
        return variables[self.x2_var] - variables[self.x1_var]

    def jacobian(self, variables: Dict[str, float]) -> Dict[str, float]:
        return {
            self.x1_var: -1.0,
            self.x2_var: 1.0,
        }


def build_equations(constraints: List[Dict[str, Any]], elements: Dict[str, Dict[str, float]]) -> List[ConstraintEquation]:
    """
    Build equation objects from constraint definitions.

    Args:
        constraints: List of constraint dicts with type, element_ids, value
        elements: Dict mapping element_id to {x1, y1, x2, y2}

    Returns:
        List of ConstraintEquation objects
    """
    equations = []

    for c in constraints:
        constraint_id = c['id']
        constraint_type = c['type']
        element_ids = c['element_ids']

        if constraint_type == 'length':
            if len(element_ids) != 1:
                continue
            target_length = c.get('value', 0)
            equations.append(LengthEquation(constraint_id, element_ids[0], target_length))

        elif constraint_type == 'horizontal':
            if len(element_ids) != 1:
                continue
            equations.append(HorizontalEquation(constraint_id, element_ids[0]))

        elif constraint_type == 'vertical':
            if len(element_ids) != 1:
                continue
            equations.append(VerticalEquation(constraint_id, element_ids[0]))

    return equations
```

**Step 2: Verify syntax**

Run: `cd serverpy/app/src && python -c "import constraint_equations; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add serverpy/app/src/constraint_equations.py
git commit -m "feat(constraints): add constraint equation builders"
```

---

## Task 4: Create Constraint Solver Module

**Files:**
- Create: `serverpy/app/src/constraint_solver.py`

**Step 1: Create the solver module**

Create `serverpy/app/src/constraint_solver.py`:

```python
"""
Newton-Raphson constraint solver for sketch geometry.
"""
import math
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import logging

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False

from constraint_equations import build_equations, ConstraintEquation

logger = logging.getLogger("constraint-solver")


@dataclass
class SolveResult:
    """Result of constraint solving."""
    success: bool
    updated_elements: Optional[Dict[str, Dict[str, float]]] = None
    error: Optional[Dict[str, Any]] = None
    iterations: int = 0


class ConstraintSolver:
    """
    Newton-Raphson iterative solver for geometric constraints.
    """

    MAX_ITERATIONS = 50
    TOLERANCE = 1e-6

    def __init__(self):
        self.equations: List[ConstraintEquation] = []
        self.variables: Dict[str, float] = {}
        self.variable_names: List[str] = []

    def solve(
        self,
        constraints: List[Dict[str, Any]],
        elements: Dict[str, Dict[str, float]]
    ) -> SolveResult:
        """
        Solve constraints and return updated element positions.

        Args:
            constraints: List of constraint dicts
            elements: Dict mapping element_id to {x1, y1, x2, y2}

        Returns:
            SolveResult with success status and updated elements
        """
        if not constraints:
            return SolveResult(success=True, updated_elements=elements, iterations=0)

        # Build equations
        self.equations = build_equations(constraints, elements)
        if not self.equations:
            return SolveResult(success=True, updated_elements=elements, iterations=0)

        # Initialize variables from elements
        self.variables = {}
        for elem_id, coords in elements.items():
            self.variables[f"{elem_id}_x1"] = coords.get('x1', 0)
            self.variables[f"{elem_id}_y1"] = coords.get('y1', 0)
            self.variables[f"{elem_id}_x2"] = coords.get('x2', 0)
            self.variables[f"{elem_id}_y2"] = coords.get('y2', 0)

        self.variable_names = sorted(self.variables.keys())

        # Check if already satisfied
        if self._check_satisfied():
            return SolveResult(
                success=True,
                updated_elements=self._extract_elements(elements.keys()),
                iterations=0
            )

        # Newton-Raphson iteration
        for iteration in range(self.MAX_ITERATIONS):
            errors = self._compute_errors()
            max_error = max(abs(e) for e in errors)

            if max_error < self.TOLERANCE:
                return SolveResult(
                    success=True,
                    updated_elements=self._extract_elements(elements.keys()),
                    iterations=iteration + 1
                )

            # Compute Jacobian and solve
            jacobian = self._compute_jacobian()
            delta = self._solve_linear_system(jacobian, errors)

            if delta is None:
                return SolveResult(
                    success=False,
                    error={
                        'type': 'unsolvable',
                        'conflicting_constraints': [eq.constraint_id for eq in self.equations],
                        'message': 'Singular Jacobian matrix - constraints may be redundant or conflicting'
                    },
                    iterations=iteration + 1
                )

            # Update variables
            for i, var_name in enumerate(self.variable_names):
                if var_name in delta:
                    self.variables[var_name] -= delta[var_name]

        # Did not converge
        return SolveResult(
            success=False,
            error={
                'type': 'unsolvable',
                'conflicting_constraints': [eq.constraint_id for eq in self.equations],
                'message': f'Solver did not converge after {self.MAX_ITERATIONS} iterations'
            },
            iterations=self.MAX_ITERATIONS
        )

    def _check_satisfied(self) -> bool:
        """Check if all constraints are currently satisfied."""
        for eq in self.equations:
            if abs(eq.error(self.variables)) > self.TOLERANCE:
                return False
        return True

    def _compute_errors(self) -> List[float]:
        """Compute error for each equation."""
        return [eq.error(self.variables) for eq in self.equations]

    def _compute_jacobian(self) -> List[Dict[str, float]]:
        """Compute Jacobian matrix (list of gradient dicts)."""
        return [eq.jacobian(self.variables) for eq in self.equations]

    def _solve_linear_system(
        self,
        jacobian: List[Dict[str, float]],
        errors: List[float]
    ) -> Optional[Dict[str, float]]:
        """
        Solve J * delta = errors for delta.
        Uses numpy if available, otherwise simple Gauss-Seidel.
        """
        n_eqs = len(self.equations)
        n_vars = len(self.variable_names)

        if n_eqs == 0:
            return {}

        if HAS_NUMPY:
            return self._solve_with_numpy(jacobian, errors)
        else:
            return self._solve_gauss_seidel(jacobian, errors)

    def _solve_with_numpy(
        self,
        jacobian: List[Dict[str, float]],
        errors: List[float]
    ) -> Optional[Dict[str, float]]:
        """Solve using numpy least squares."""
        n_eqs = len(self.equations)
        n_vars = len(self.variable_names)

        # Build matrix
        J = np.zeros((n_eqs, n_vars))
        for i, jac in enumerate(jacobian):
            for j, var_name in enumerate(self.variable_names):
                J[i, j] = jac.get(var_name, 0.0)

        b = np.array(errors)

        try:
            # Use least squares for potentially underdetermined systems
            delta, residuals, rank, s = np.linalg.lstsq(J, b, rcond=None)
            return {var_name: delta[i] for i, var_name in enumerate(self.variable_names)}
        except np.linalg.LinAlgError:
            return None

    def _solve_gauss_seidel(
        self,
        jacobian: List[Dict[str, float]],
        errors: List[float]
    ) -> Optional[Dict[str, float]]:
        """Simple iterative solver fallback."""
        delta = {var: 0.0 for var in self.variable_names}

        # Simple gradient descent step
        for i, eq in enumerate(self.equations):
            jac = jacobian[i]
            err = errors[i]

            # Distribute error proportionally to gradients
            grad_sum = sum(g * g for g in jac.values())
            if grad_sum > 1e-10:
                scale = err / grad_sum
                for var, grad in jac.items():
                    if var in delta:
                        delta[var] += grad * scale * 0.5  # Damped step

        return delta

    def _extract_elements(self, element_ids) -> Dict[str, Dict[str, float]]:
        """Extract element coordinates from variables."""
        result = {}
        for elem_id in element_ids:
            result[elem_id] = {
                'x1': self.variables.get(f"{elem_id}_x1", 0),
                'y1': self.variables.get(f"{elem_id}_y1", 0),
                'x2': self.variables.get(f"{elem_id}_x2", 0),
                'y2': self.variables.get(f"{elem_id}_y2", 0),
            }
        return result

    def validate_constraint(
        self,
        constraint: Dict[str, Any],
        existing_constraints: List[Dict[str, Any]],
        elements: Dict[str, Dict[str, float]]
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if adding a constraint would over-constrain the sketch.

        Returns:
            (is_valid, error_message)
        """
        all_constraints = existing_constraints + [constraint]
        result = self.solve(all_constraints, elements)

        if result.success:
            return True, None
        else:
            return False, result.error.get('message', 'Unknown error')
```

**Step 2: Verify syntax**

Run: `cd serverpy/app/src && python -c "import constraint_solver; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add serverpy/app/src/constraint_solver.py
git commit -m "feat(constraints): add Newton-Raphson constraint solver"
```

---

## Task 5: Add Constraint Storage to Sketch Class

**Files:**
- Modify: `serverpy/app/src/geometry_engine.py`

**Step 1: Add constraints list to Sketch.__init__**

In `geometry_engine.py`, find the `Sketch.__init__` method (around line 124) and add constraints storage:

```python
def __init__(self, sketch_id: str, plane_id: str, sketch_plane: 'SketchPlane'):
    self.sketch_id = sketch_id
    self.plane_id = plane_id
    self.sketch_plane = sketch_plane
    self.elements: List[SketchElement] = []
    self.constraints: List[Dict[str, Any]] = []  # ADD THIS LINE
    self.is_closed = False

    print(f"✅ Created sketch: {sketch_id} on plane: {plane_id}")
```

**Step 2: Add constraint management methods to Sketch class**

Add these methods to the Sketch class (after `remove_element` method):

```python
def add_constraint(self, constraint: Dict[str, Any]) -> bool:
    """Add constraint to sketch."""
    self.constraints.append(constraint)
    print(f"✅ Added constraint to sketch {self.sketch_id}: {constraint['type']}")
    return True

def remove_constraint(self, constraint_id: str) -> bool:
    """Remove constraint by ID."""
    for i, c in enumerate(self.constraints):
        if c.get('id') == constraint_id:
            self.constraints.pop(i)
            print(f"✅ Removed constraint {constraint_id} from sketch {self.sketch_id}")
            return True
    return False

def get_constraint(self, constraint_id: str) -> Optional[Dict[str, Any]]:
    """Get constraint by ID."""
    for c in self.constraints:
        if c.get('id') == constraint_id:
            return c
    return None

def get_constraints(self) -> List[Dict[str, Any]]:
    """Get all constraints."""
    return self.constraints

def get_elements_as_dict(self) -> Dict[str, Dict[str, float]]:
    """Get all line elements as dict for solver."""
    result = {}
    for elem in self.elements:
        if elem.element_type == SketchElementType.LINE:
            result[elem.id] = {
                'x1': elem.start_point.X() if elem.start_point else 0,
                'y1': elem.start_point.Y() if elem.start_point else 0,
                'x2': elem.end_point.X() if elem.end_point else 0,
                'y2': elem.end_point.Y() if elem.end_point else 0,
            }
    return result
```

**Step 3: Verify the file still loads**

Run: `cd serverpy/app/src && python -c "from geometry_engine import Sketch; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add serverpy/app/src/geometry_engine.py
git commit -m "feat(constraints): add constraint storage to Sketch class"
```

---

## Task 6: Add Constraint API Endpoints

**Files:**
- Modify: `serverpy/app/src/api_server.py`

**Step 1: Add Pydantic models for constraints**

Add after the existing request models (around line 200):

```python
class CreateConstraintRequest(BaseModel):
    """Request model for creating constraints"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    type: str = Field(..., description="Constraint type (length, horizontal, vertical, perpendicular, parallel, coincident)")
    element_ids: List[str] = Field(..., description="Element IDs involved in constraint")
    point_indices: Optional[List[int]] = Field(None, description="Point indices for coincident (0=start, 1=end)")
    value: Optional[float] = Field(None, description="Value for length constraints")


class UpdateConstraintRequest(BaseModel):
    """Request model for updating constraints"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    value: float = Field(..., description="New value for length constraint")


class ValidateConstraintRequest(BaseModel):
    """Request model for validating proposed changes"""
    session_id: str = Field(..., description="Session ID")
    sketch_id: str = Field(..., description="Sketch ID")
    proposed_change: Dict[str, Any] = Field(..., description="Proposed geometry change")
```

**Step 2: Add import for constraint solver**

Add to imports at top of file:

```python
from constraint_solver import ConstraintSolver, SolveResult
```

**Step 3: Add constraint endpoints**

Add these endpoints (after the existing endpoints, before the `run_server` function):

```python
@app.post("/api/v1/constraints")
async def create_constraint(
    request: CreateConstraintRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Create a new constraint on a sketch."""
    session_id = request.session_id or x_session_id or "default"

    try:
        engine = SessionManager.get_instance().get_or_create_session(session_id)
        sketch = engine.get_sketch(request.sketch_id)

        if sketch is None:
            return api_response(success=False, error=f"Sketch not found: {request.sketch_id}")

        # Generate constraint ID
        constraint_id = f"constraint_{request.type}_{int(time.time() * 1000)}"

        constraint = {
            'id': constraint_id,
            'type': request.type,
            'sketch_id': request.sketch_id,
            'element_ids': request.element_ids,
            'point_indices': request.point_indices,
            'value': request.value,
            'satisfied': True,
            'inferred': False,
            'confirmed': True,
        }

        # Validate constraint won't over-constrain
        solver = ConstraintSolver()
        elements = sketch.get_elements_as_dict()
        existing_constraints = sketch.get_constraints()

        is_valid, error_msg = solver.validate_constraint(constraint, existing_constraints, elements)
        if not is_valid:
            return api_response(
                success=False,
                error=f"Cannot add constraint: {error_msg}"
            )

        # Add constraint and solve
        sketch.add_constraint(constraint)
        all_constraints = sketch.get_constraints()

        result = solver.solve(all_constraints, elements)

        if not result.success:
            # Roll back
            sketch.remove_constraint(constraint_id)
            return api_response(
                success=False,
                error=result.error.get('message', 'Solver failed')
            )

        # Update element positions if changed
        updated_elements = []
        if result.updated_elements:
            for elem_id, coords in result.updated_elements.items():
                elem = sketch.get_element_by_id(elem_id)
                if elem and elem.element_type == SketchElementType.LINE:
                    from OCC.Core.gp import gp_Pnt2d
                    elem.start_point = gp_Pnt2d(coords['x1'], coords['y1'])
                    elem.end_point = gp_Pnt2d(coords['x2'], coords['y2'])
                    # Build visualization data
                    viz = engine.get_element_visualization_data(request.sketch_id, elem_id)
                    if viz:
                        updated_elements.append(viz)

        return api_response(
            success=True,
            data={
                'constraint': constraint,
                'updated_elements': updated_elements,
                'solve_status': 'solved' if result.iterations > 0 else 'already_satisfied'
            }
        )

    except Exception as e:
        logger.error(f"Error creating constraint: {e}")
        return api_response(success=False, error=str(e))


@app.delete("/api/v1/constraints/{constraint_id}")
async def delete_constraint(
    constraint_id: str,
    session_id: Optional[str] = None,
    sketch_id: Optional[str] = None,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Delete a constraint."""
    session_id = session_id or x_session_id or "default"

    try:
        engine = SessionManager.get_instance().get_or_create_session(session_id)

        # Find sketch containing this constraint
        target_sketch = None
        if sketch_id:
            target_sketch = engine.get_sketch(sketch_id)
        else:
            # Search all sketches
            for sketch in engine.sketches.values():
                if sketch.get_constraint(constraint_id):
                    target_sketch = sketch
                    break

        if target_sketch is None:
            return api_response(success=False, error=f"Constraint not found: {constraint_id}")

        success = target_sketch.remove_constraint(constraint_id)
        return api_response(success=success)

    except Exception as e:
        logger.error(f"Error deleting constraint: {e}")
        return api_response(success=False, error=str(e))


@app.put("/api/v1/constraints/{constraint_id}")
async def update_constraint(
    constraint_id: str,
    request: UpdateConstraintRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Update a constraint value (for length constraints)."""
    session_id = request.session_id or x_session_id or "default"

    try:
        engine = SessionManager.get_instance().get_or_create_session(session_id)
        sketch = engine.get_sketch(request.sketch_id)

        if sketch is None:
            return api_response(success=False, error=f"Sketch not found: {request.sketch_id}")

        constraint = sketch.get_constraint(constraint_id)
        if constraint is None:
            return api_response(success=False, error=f"Constraint not found: {constraint_id}")

        if constraint['type'] != 'length':
            return api_response(success=False, error="Can only update value for length constraints")

        # Update value
        old_value = constraint.get('value')
        constraint['value'] = request.value

        # Re-solve
        solver = ConstraintSolver()
        elements = sketch.get_elements_as_dict()
        all_constraints = sketch.get_constraints()

        result = solver.solve(all_constraints, elements)

        if not result.success:
            # Roll back
            constraint['value'] = old_value
            return api_response(
                success=False,
                error=result.error.get('message', 'Solver failed')
            )

        # Update element positions
        updated_elements = []
        if result.updated_elements:
            for elem_id, coords in result.updated_elements.items():
                elem = sketch.get_element_by_id(elem_id)
                if elem and elem.element_type == SketchElementType.LINE:
                    from OCC.Core.gp import gp_Pnt2d
                    elem.start_point = gp_Pnt2d(coords['x1'], coords['y1'])
                    elem.end_point = gp_Pnt2d(coords['x2'], coords['y2'])
                    viz = engine.get_element_visualization_data(request.sketch_id, elem_id)
                    if viz:
                        updated_elements.append(viz)

        return api_response(
            success=True,
            data={
                'constraint': constraint,
                'updated_elements': updated_elements
            }
        )

    except Exception as e:
        logger.error(f"Error updating constraint: {e}")
        return api_response(success=False, error=str(e))


@app.post("/api/v1/constraints/validate")
async def validate_constraint_change(
    request: ValidateConstraintRequest,
    x_session_id: Optional[str] = Header(None, alias="X-Session-ID")
):
    """Validate if a proposed geometry change satisfies constraints."""
    session_id = request.session_id or x_session_id or "default"

    try:
        engine = SessionManager.get_instance().get_or_create_session(session_id)
        sketch = engine.get_sketch(request.sketch_id)

        if sketch is None:
            return api_response(success=False, error=f"Sketch not found: {request.sketch_id}")

        # Apply proposed change to a copy of elements
        elements = sketch.get_elements_as_dict()
        proposed = request.proposed_change

        if 'element_id' in proposed and proposed['element_id'] in elements:
            elem_id = proposed['element_id']
            new_values = proposed.get('new_values', {})
            elements[elem_id].update(new_values)

        # Solve with proposed state
        solver = ConstraintSolver()
        constraints = sketch.get_constraints()
        result = solver.solve(constraints, elements)

        violations = []
        if not result.success and result.error:
            violations = [
                {'constraint_id': cid, 'message': result.error.get('message', '')}
                for cid in result.error.get('conflicting_constraints', [])
            ]

        return api_response(
            success=True,
            data={
                'valid': result.success,
                'violations': violations
            }
        )

    except Exception as e:
        logger.error(f"Error validating constraint: {e}")
        return api_response(success=False, error=str(e))
```

**Step 4: Add missing import**

Add to imports section:

```python
from geometry_engine import Vector3d, MeshData, SketchElementType
```

**Step 5: Verify syntax**

Run: `cd serverpy/app/src && python -c "import api_server; print('OK')"`
Expected: `OK`

**Step 6: Commit**

```bash
git add serverpy/app/src/api_server.py
git commit -m "feat(constraints): add constraint API endpoints"
```

---

## Task 7: Add Unit Tests for Constraint Solver

**Files:**
- Create: `serverpy/app/src/test_constraint_solver.py`

**Step 1: Create test file**

Create `serverpy/app/src/test_constraint_solver.py`:

```python
"""
Unit tests for constraint solver.
Run with: python test_constraint_solver.py
"""
import sys
import math


def test_length_constraint():
    """Test that length constraint resizes line correctly."""
    from constraint_solver import ConstraintSolver

    solver = ConstraintSolver()

    # Line from (0,0) to (10,0) - length 10
    elements = {
        'line1': {'x1': 0, 'y1': 0, 'x2': 10, 'y2': 0}
    }

    # Constrain to length 20
    constraints = [
        {'id': 'c1', 'type': 'length', 'element_ids': ['line1'], 'value': 20}
    ]

    result = solver.solve(constraints, elements)

    assert result.success, f"Solver failed: {result.error}"

    # Check new length
    new_coords = result.updated_elements['line1']
    dx = new_coords['x2'] - new_coords['x1']
    dy = new_coords['y2'] - new_coords['y1']
    new_length = math.sqrt(dx*dx + dy*dy)

    assert abs(new_length - 20) < 0.01, f"Expected length 20, got {new_length}"
    print("✅ test_length_constraint passed")
    return True


def test_horizontal_constraint():
    """Test that horizontal constraint makes line horizontal."""
    from constraint_solver import ConstraintSolver

    solver = ConstraintSolver()

    # Tilted line from (0,0) to (10,5)
    elements = {
        'line1': {'x1': 0, 'y1': 0, 'x2': 10, 'y2': 5}
    }

    constraints = [
        {'id': 'c1', 'type': 'horizontal', 'element_ids': ['line1']}
    ]

    result = solver.solve(constraints, elements)

    assert result.success, f"Solver failed: {result.error}"

    new_coords = result.updated_elements['line1']
    dy = abs(new_coords['y2'] - new_coords['y1'])

    assert dy < 0.01, f"Expected horizontal (dy=0), got dy={dy}"
    print("✅ test_horizontal_constraint passed")
    return True


def test_vertical_constraint():
    """Test that vertical constraint makes line vertical."""
    from constraint_solver import ConstraintSolver

    solver = ConstraintSolver()

    # Tilted line from (0,0) to (5,10)
    elements = {
        'line1': {'x1': 0, 'y1': 0, 'x2': 5, 'y2': 10}
    }

    constraints = [
        {'id': 'c1', 'type': 'vertical', 'element_ids': ['line1']}
    ]

    result = solver.solve(constraints, elements)

    assert result.success, f"Solver failed: {result.error}"

    new_coords = result.updated_elements['line1']
    dx = abs(new_coords['x2'] - new_coords['x1'])

    assert dx < 0.01, f"Expected vertical (dx=0), got dx={dx}"
    print("✅ test_vertical_constraint passed")
    return True


def test_combined_constraints():
    """Test horizontal + length constraints together."""
    from constraint_solver import ConstraintSolver

    solver = ConstraintSolver()

    # Tilted line from (0,0) to (10,5) - length ~11.18
    elements = {
        'line1': {'x1': 0, 'y1': 0, 'x2': 10, 'y2': 5}
    }

    constraints = [
        {'id': 'c1', 'type': 'horizontal', 'element_ids': ['line1']},
        {'id': 'c2', 'type': 'length', 'element_ids': ['line1'], 'value': 15}
    ]

    result = solver.solve(constraints, elements)

    assert result.success, f"Solver failed: {result.error}"

    new_coords = result.updated_elements['line1']

    # Check horizontal
    dy = abs(new_coords['y2'] - new_coords['y1'])
    assert dy < 0.01, f"Expected horizontal, got dy={dy}"

    # Check length
    dx = new_coords['x2'] - new_coords['x1']
    new_length = abs(dx)  # Horizontal, so length = |dx|
    assert abs(new_length - 15) < 0.01, f"Expected length 15, got {new_length}"

    print("✅ test_combined_constraints passed")
    return True


def test_no_constraints():
    """Test that solver handles empty constraints."""
    from constraint_solver import ConstraintSolver

    solver = ConstraintSolver()

    elements = {
        'line1': {'x1': 0, 'y1': 0, 'x2': 10, 'y2': 5}
    }

    result = solver.solve([], elements)

    assert result.success, "Solver should succeed with no constraints"
    assert result.iterations == 0, "Should need 0 iterations"
    print("✅ test_no_constraints passed")
    return True


def test_already_satisfied():
    """Test that solver recognizes already-satisfied constraints."""
    from constraint_solver import ConstraintSolver

    solver = ConstraintSolver()

    # Horizontal line from (0,5) to (10,5)
    elements = {
        'line1': {'x1': 0, 'y1': 5, 'x2': 10, 'y2': 5}
    }

    constraints = [
        {'id': 'c1', 'type': 'horizontal', 'element_ids': ['line1']}
    ]

    result = solver.solve(constraints, elements)

    assert result.success, "Solver should succeed"
    assert result.iterations == 0, f"Expected 0 iterations (already satisfied), got {result.iterations}"
    print("✅ test_already_satisfied passed")
    return True


def main():
    """Run all tests."""
    print("🧪 Running Constraint Solver Tests")
    print("=" * 50)

    tests = [
        test_no_constraints,
        test_already_satisfied,
        test_length_constraint,
        test_horizontal_constraint,
        test_vertical_constraint,
        test_combined_constraints,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ {test.__name__} failed with error: {e}")
            failed += 1

    print("=" * 50)
    print(f"Results: {passed} passed, {failed} failed")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
```

**Step 2: Run tests**

Run: `cd serverpy/app/src && python test_constraint_solver.py`
Expected: All tests pass (6 passed, 0 failed)

**Step 3: Commit**

```bash
git add serverpy/app/src/test_constraint_solver.py
git commit -m "test(constraints): add unit tests for constraint solver"
```

---

## Task 8: Update Known Issues Doc

**Files:**
- Modify: `Docs/known-issues.md`

**Step 1: Update constraint system status**

Find section "### 6. No Constraint System" and update it:

```markdown
### 6. Constraint System - Phase 1 Complete

**Status:** In Progress

Phase 1 of the constraint system is implemented:
- ✅ Backend constraint solver (Newton-Raphson)
- ✅ Length, horizontal, vertical constraints
- ✅ API endpoints for constraint CRUD
- ⏳ Phase 2: Dimension integration
- ⏳ Phase 3-5: Frontend UI and remaining constraints

See `Docs/plans/2026-02-01-constraint-system-design.md` for full design.
```

**Step 2: Commit**

```bash
git add Docs/known-issues.md
git commit -m "docs: update constraint system status in known issues"
```

---

## Summary

After completing all 8 tasks, Phase 1 provides:

1. **Type definitions** for constraints (TypeScript)
2. **Constraint equations** for length, horizontal, vertical
3. **Newton-Raphson solver** with numpy optimization
4. **Sketch storage** for constraints
5. **API endpoints** for create/update/delete/validate
6. **Unit tests** validating solver behavior

The system can now:
- Add length constraints to lines
- Add horizontal/vertical constraints to lines
- Solve multiple constraints simultaneously
- Reject over-constrained configurations
- Validate proposed geometry changes

**Next Phase:** Dimension Migration - refactor DimensionManager to use constraints internally.
