# Sketch Tools Implementation Design

## Overview

Implement interactive UIs for 6 sketch modification tools: Trim, Extend, Mirror, Offset, Copy, and Move. Backend endpoints and client API methods already exist - this design covers the frontend interaction patterns.

## Tool Interaction Patterns

### Draw-to-Select Tools (Trim, Extend, Mirror)

| Tool | User Action | System Response |
|------|-------------|-----------------|
| **Trim** | Draw line across element to trim | Trims at intersection, keeps side where draw started |
| **Extend** | Draw line from element to target boundary | Extends the crossed end toward target |
| **Mirror** | First select element(s), then draw mirror axis | Creates mirrored copy across the drawn line |

**Shared behavior:**
- Cursor changes to `cell` (same as fillet/chamfer)
- Status bar shows current instruction
- ESC cancels and returns to select tool
- Draw preview line shown while dragging

### Click + Input Tools (Offset, Copy, Move)

| Tool | Step 1 | Step 2 |
|------|--------|--------|
| **Offset** | Click element | Inline input: `Distance: [__]` with left/right toggle |
| **Copy** | Click element | Inline input: `X: [__] Y: [__] Copies: [1]` OR drag |
| **Move** | Click element | Inline input: `X: [__] Y: [__]` OR drag to position |

**Drag behavior for Copy/Move:**
- Click and drag from element shows ghost preview at cursor
- Release to confirm position
- Snaps to grid points
- Shift+drag constrains to horizontal/vertical

## State Management

### New Tool Types

```typescript
type DrawingTool =
  | 'select' | 'line' | 'rectangle' | 'circle' | 'arc' | 'polygon'
  | 'fillet' | 'chamfer'
  | 'trim' | 'extend' | 'mirror'  // Draw-to-select
  | 'offset' | 'copy' | 'move';   // Click + input
```

### Pending Operation State

```typescript
const [pendingOperation, setPendingOperation] = useState<{
  tool: 'trim' | 'extend' | 'mirror' | 'offset' | 'copy' | 'move';
  sketchId: string;
  elementIds: string[];
  // Tool-specific data
  mirrorAxisStart?: Vector2;
  mirrorAxisEnd?: Vector2;
} | null>(null);
```

## Keyboard Shortcuts

| Key | Tool | Notes |
|-----|------|-------|
| T | Trim | Already exists |
| W | Extend | "Widen" (X is delete, E is extrude) |
| M | Mirror | |
| O | Offset | |
| D | Copy | "Duplicate" (C is circle) |
| G | Move | "Go" (V is select) |

## Files to Modify

| File | Changes |
|------|---------|
| `cad-controls.ts` | Add new tool types, handle draw-complete for trim/extend/mirror |
| `cad-application.tsx` | Add pendingOperation state, inline input UIs, keyboard handlers |
| `cad-renderer.ts` | Add ghost preview for copy/move drag |

## Implementation Order

1. **Trim** - Draw-to-select, find intersection, call `trimLineToLine`
2. **Extend** - Draw-to-select, find target, call `extendLineToLine`
3. **Mirror** - Select elements, draw axis, call `mirrorElements`
4. **Offset** - Click element, inline distance input, call `offsetElement`
5. **Copy** - Click element, inline X/Y/copies OR drag, call `copyElement`
6. **Move** - Click element, inline X/Y OR drag, call `moveElement`

## API Endpoints (Already Exist)

- `POST /api/v1/cad/trim-line-to-line` - sketch_id, line_to_trim_id, cutting_line_id, keep_start
- `POST /api/v1/cad/extend-line-to-line` - sketch_id, line_to_extend_id, target_line_id, extend_start
- `POST /api/v1/cad/mirror-elements` - sketch_id, element_ids[], mirror_line_id, keep_original
- `POST /api/v1/cad/offset-element-directional` - sketch_id, element_id, offset_distance, direction
- `POST /api/v1/cad/copy-element` - sketch_id, element_id, num_copies, direction_x, direction_y, distance
- `POST /api/v1/cad/move-element` - sketch_id, element_id, direction_x, direction_y, distance
