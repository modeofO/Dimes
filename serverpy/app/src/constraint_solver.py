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
