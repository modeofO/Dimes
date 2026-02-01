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


class PerpendicularEquation(ConstraintEquation):
    """
    Perpendicular constraint: two lines are at 90 degrees.
    Uses dot product of direction vectors = 0.
    Error = dx1 * dx2 + dy1 * dy2
    """
    def __init__(self, constraint_id: str, element1_id: str, element2_id: str):
        super().__init__(constraint_id, 'perpendicular')
        self.element1_id = element1_id
        self.element2_id = element2_id
        # Variables for first line
        self.x1_1 = f"{element1_id}_x1"
        self.y1_1 = f"{element1_id}_y1"
        self.x1_2 = f"{element1_id}_x2"
        self.y1_2 = f"{element1_id}_y2"
        # Variables for second line
        self.x2_1 = f"{element2_id}_x1"
        self.y2_1 = f"{element2_id}_y1"
        self.x2_2 = f"{element2_id}_x2"
        self.y2_2 = f"{element2_id}_y2"

    def error(self, variables: Dict[str, float]) -> float:
        # Direction vectors
        dx1 = variables[self.x1_2] - variables[self.x1_1]
        dy1 = variables[self.y1_2] - variables[self.y1_1]
        dx2 = variables[self.x2_2] - variables[self.x2_1]
        dy2 = variables[self.y2_2] - variables[self.y2_1]
        # Dot product = 0 for perpendicular
        return dx1 * dx2 + dy1 * dy2

    def jacobian(self, variables: Dict[str, float]) -> Dict[str, float]:
        dx1 = variables[self.x1_2] - variables[self.x1_1]
        dy1 = variables[self.y1_2] - variables[self.y1_1]
        dx2 = variables[self.x2_2] - variables[self.x2_1]
        dy2 = variables[self.y2_2] - variables[self.y2_1]

        # d(dx1*dx2 + dy1*dy2)/d(var)
        # dx1 = x1_2 - x1_1, so d(dx1)/d(x1_2) = 1, d(dx1)/d(x1_1) = -1
        return {
            self.x1_1: -dx2,  # d/d(x1_1) = -1 * dx2
            self.y1_1: -dy2,  # d/d(y1_1) = -1 * dy2
            self.x1_2: dx2,   # d/d(x1_2) = 1 * dx2
            self.y1_2: dy2,   # d/d(y1_2) = 1 * dy2
            self.x2_1: -dx1,  # d/d(x2_1) = -1 * dx1
            self.y2_1: -dy1,  # d/d(y2_1) = -1 * dy1
            self.x2_2: dx1,   # d/d(x2_2) = 1 * dx1
            self.y2_2: dy1,   # d/d(y2_2) = 1 * dy1
        }


class ParallelEquation(ConstraintEquation):
    """
    Parallel constraint: two lines have the same angle.
    Uses cross product of direction vectors = 0.
    Error = dx1 * dy2 - dy1 * dx2
    """
    def __init__(self, constraint_id: str, element1_id: str, element2_id: str):
        super().__init__(constraint_id, 'parallel')
        self.element1_id = element1_id
        self.element2_id = element2_id
        # Variables for first line
        self.x1_1 = f"{element1_id}_x1"
        self.y1_1 = f"{element1_id}_y1"
        self.x1_2 = f"{element1_id}_x2"
        self.y1_2 = f"{element1_id}_y2"
        # Variables for second line
        self.x2_1 = f"{element2_id}_x1"
        self.y2_1 = f"{element2_id}_y1"
        self.x2_2 = f"{element2_id}_x2"
        self.y2_2 = f"{element2_id}_y2"

    def error(self, variables: Dict[str, float]) -> float:
        # Direction vectors
        dx1 = variables[self.x1_2] - variables[self.x1_1]
        dy1 = variables[self.y1_2] - variables[self.y1_1]
        dx2 = variables[self.x2_2] - variables[self.x2_1]
        dy2 = variables[self.y2_2] - variables[self.y2_1]
        # Cross product = 0 for parallel
        return dx1 * dy2 - dy1 * dx2

    def jacobian(self, variables: Dict[str, float]) -> Dict[str, float]:
        dx1 = variables[self.x1_2] - variables[self.x1_1]
        dy1 = variables[self.y1_2] - variables[self.y1_1]
        dx2 = variables[self.x2_2] - variables[self.x2_1]
        dy2 = variables[self.y2_2] - variables[self.y2_1]

        # d(dx1*dy2 - dy1*dx2)/d(var)
        return {
            self.x1_1: -dy2,  # d/d(x1_1) = -1 * dy2
            self.y1_1: dx2,   # d/d(y1_1) = -(-1 * dx2) = dx2
            self.x1_2: dy2,   # d/d(x1_2) = 1 * dy2
            self.y1_2: -dx2,  # d/d(y1_2) = -(1 * dx2) = -dx2
            self.x2_1: dy1,   # d/d(x2_1) = -(-1 * dy1) = dy1
            self.y2_1: -dx1,  # d/d(y2_1) = -1 * dx1
            self.x2_2: -dy1,  # d/d(x2_2) = -(1 * dy1) = -dy1
            self.y2_2: dx1,   # d/d(y2_2) = 1 * dx1
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

    return equations
