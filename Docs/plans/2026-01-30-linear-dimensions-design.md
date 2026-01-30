# Linear Dimensions Design

## Overview

A dimensioning system for the Krakow CAD application that allows users to set dimensions on lines. Dimensions are editable constraints - changing the dimension value resizes the line.

## Scope

**In scope:**
- Linear dimensions on lines (length measurement)
- Editable constraints (change value → resize line)
- Offset placement (dimension parallel to line)
- Symmetric line resize (midpoint stays fixed)

**Out of scope (future):**
- Point-to-point dimensions
- Radial dimensions (circles/arcs)
- Angular dimensions
- Full constraint solver

## Data Model

### LinearDimension

```typescript
interface LinearDimension {
  id: string;
  type: 'linear';
  element_id: string;        // The line being dimensioned
  value: number;             // Current length value (in current units)
  offset: number;            // Perpendicular distance from line
  offset_direction: 1 | -1;  // Which side of the line
}
```

### Sketch Extension

```typescript
interface Sketch {
  // ... existing fields
  dimensions: LinearDimension[];
}
```

## Interaction Flow

### Creating a Dimension

1. User presses `D` or selects "Dimension" tool from command palette
2. User clicks on a line → line highlights, dimension preview appears
3. User moves mouse perpendicular to line → dimension offset updates in real-time
4. User clicks to place → dimension is created and stored

### Editing a Dimension

1. User double-clicks an existing dimension text
2. Input field appears inline with current value
3. User types new value, presses Enter
4. Line resizes symmetrically to match new length
5. Dimension value updates to reflect new length

### Deleting a Dimension

- Select dimension + press `X` (same as other elements)

### Keyboard Shortcut

- `Shift+D` - Activate dimension tool (D is used for copy/duplicate)

## Visual Design

### Dimension Anatomy

```
         ┌─── dimension text ("25.4 mm")
         │
    ◄────┼────►   ← arrows at ends
    │    │    │
    │         │   ← dimension line (parallel to measured line)
    │         │
    ├─────────┤   ← extension lines (perpendicular)
    │         │
====•=========•====  ← the actual line being dimensioned
```

### Colors & Styling

- Dimension line & arrows: `#4A9EFF` (blue)
- Extension lines: `#4A9EFF` at 50% opacity
- Text: White, sprite-based (always faces camera)
- Selected dimension: Brighter highlight
- Editing state: Text replaced with input field

### Text Rendering

Use Three.js sprite-based text rather than 3D geometry:
- Always readable regardless of view angle
- Better performance than TextGeometry
- Consistent sizing across zoom levels

## Constraint Solving

### Line Resize Algorithm

For line-only dimensions with symmetric resize, direct calculation is sufficient:

```typescript
function resizeLine(line: LineElement, newLength: number): LineElement {
  // Get current midpoint (stays fixed)
  const midX = (line.x1 + line.x2) / 2;
  const midY = (line.y1 + line.y2) / 2;

  // Get normalized direction vector
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const currentLength = Math.sqrt(dx*dx + dy*dy);
  const ux = dx / currentLength;
  const uy = dy / currentLength;

  // New endpoints at half the new length from midpoint
  const half = newLength / 2;
  return {
    ...line,
    x1: midX - ux * half,
    y1: midY - uy * half,
    x2: midX + ux * half,
    y2: midY + uy * half,
  };
}
```

### Cascading Updates

When a line changes:
1. Update the dimension's stored `value`
2. Re-render the line visualization
3. Re-render the dimension visualization
4. Update any dependent elements (fillets/chamfers) or warn user

## Architecture

### New Files

```
client/src/
├── lib/cad/
│   ├── dimensions/
│   │   ├── dimension-manager.ts    # Manages dimension CRUD, selection
│   │   ├── dimension-renderer.ts   # Three.js rendering (lines, arrows, text)
│   │   └── dimension-solver.ts     # Line resize calculations
│   └── utils/
│       └── geometry-utils.ts       # Distance, projection, vector math
├── components/
│   └── dimension-input.tsx         # Inline edit input component

api-server/src/routes/
│   └── cad.js                      # Add dimension endpoints

shared/types/
│   └── geometry.ts                 # Add LinearDimension type
```

### Files to Modify

- `cad-controls.ts` - Add dimension tool state and interaction handlers
- `cad-renderer.ts` - Integrate DimensionManager, handle dimension selection
- `visualization-manager.ts` - Coordinate with dimension rendering
- `cad-application.tsx` - Add dimension tool to state, keyboard shortcut
- `cad-client.ts` - Add API methods for dimensions
- `command-palette.tsx` - Add dimension command
- `bottom-hud.tsx` - Show dimension tool hint

### Data Flow

1. User creates dimension → `CADControls` captures interaction
2. `CADApplication` calls `cadClient.addDimension()`
3. API stores dimension in sketch data
4. Response triggers `DimensionManager.addDimension()`
5. `DimensionRenderer` creates Three.js objects

## API Endpoints

### Create Dimension

```
POST /api/v1/cad/dimensions
{
  sketch_id: string,
  element_id: string,
  offset: number,
  offset_direction: 1 | -1
}
```

### Update Dimension (resize line)

```
PUT /api/v1/cad/dimensions/:dimensionId
{
  value: number  // New length value
}
```

### Delete Dimension

```
DELETE /api/v1/cad/dimensions/:dimensionId
```

## Future Extensions

1. **Point-to-point dimensions** - Click two points to measure distance
2. **Radial dimensions** - Diameter/radius for circles and arcs
3. **Angular dimensions** - Angle between two lines
4. **Constraint solver** - Full parametric system for complex relationships
5. **Driven dimensions** - Read-only dimensions that display calculated values
6. **Dimension styles** - Customizable appearance (arrow types, text size, etc.)
