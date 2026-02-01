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
