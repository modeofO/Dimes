# Dimes CAD - Known Issues & Deferred Work

## Status Legend

- **Deferred** - User explicitly said to handle later
- **Known Bug** - Identified but not yet fixed
- **Needs Investigation** - Root cause not yet determined
- **Architecture** - Structural issue requiring design decisions
- **Fixed** - Issue has been resolved

---

## Fixed Issues

### 1. Fillet, Chamfer, Delete - FIXED

Fillet and chamfer now work with a draw-to-select UX:
1. User selects fillet/chamfer tool (F/H key) - cursor changes to 'cell'
2. User draws a line across two sketch lines to select them
3. Inline input appears for radius/distance
4. Backend creates the fillet arc or chamfer line with correct geometry

Delete now works for sketch elements:
- Press X or Delete key to delete selected element
- Full stack implementation: Frontend to API Server to Python Backend
- Handles composite shapes (deletes parent and all child lines)

### 2. API Server WebSocket Inconsistency - FIXED

All WebSocket messages now consistently use the `payload` key for data.

### 3. element_id Validation - FIXED

The extrude endpoint's `element_id` validation is now required (not optional) to match the backend's requirement.

### 4. Missing Response Validation - FIXED

Boolean operations handler now has fallback logic checking for `visualization_data` first, then `mesh_data`.

### 5. Trim, Extend, Mirror, Offset, Copy, Move Tools - FIXED

All sketch modification tools now have interactive UIs:

| Tool | Keyboard | UX |
|------|----------|-----|
| Trim | T | Draw across two lines, keeps side where draw started |
| Extend | W | Draw from line toward target |
| Mirror | M | Select element, draw mirror axis |
| Offset | O | Click element, inline distance input with L/R |
| Copy | D | Click element, inline X/Y/count input |
| Move | G | Click element, inline X/Y input |

### 6. Model ID Collision - FIXED

Model IDs are now generated with both timestamp and counter: `model-${Date.now()}-${++modelIdCounter}`.

### 7. Hover Highlight Cleanup - FIXED

`setDrawingTool()` now calls `clearHoverHighlight()` and resets cursor.

### 8. UX Improvements - FIXED

- Drawing tool cursors (crosshair for drawing, cell for modification, pointer for hover)
- Escape-to-select behavior (press Escape to return to select tool before exiting sketch)
- Box/drag selection with Shift+drag

### 9. Visual Selection of Planes/Sketches - FIXED

Planes and sketches can no longer be visually selected in the viewport. Only sketch elements (lines, circles, etc.) can be selected for operations.

### 10. Sketch Tool Dialog Boxes - FIXED

Move, copy, and offset tools now correctly show their input dialogs. Fixed stale React callback issue where `currentDrawingTool` was captured at initialization time.

### 11. Backend Naming Convention - FIXED

All C++/cpp backend references have been renamed to CAD backend throughout the codebase:
- `CppBackendClient` renamed to `CadBackendClient`
- `cppBackendClient.js` renamed to `cadBackendClient.js`
- Environment variables renamed from `CPP_BACKEND_*` to `CAD_BACKEND_*`
- All comments and documentation updated

---

## Open Issues

### 1. Undo/Redo Not Implemented

**Status:** Known Bug
**Location:** `cad-application.tsx:777-787`

Currently shows "Undo/Redo (not yet implemented)" status message when Ctrl+Z / Ctrl+Shift+Z is pressed.

Implementation would require:
- Command history stack
- Backend support for reversing operations
- Scene state snapshots or incremental undo

### 2. Sketch-on-Face: Normal-to-Plane Mapping Approximation

**Status:** Known Bug
**Location:** `cad-application.tsx:506-517`

When clicking a face of extruded geometry, the face normal is mapped to the closest standard plane type (XZ/XY/YZ). This is an approximation that works for axis-aligned faces but fails for:
- Angled faces (e.g., chamfered edges, draft angles)
- Curved surfaces (face normal varies across the surface)
- Rotated geometry

For a proper implementation, the backend would need to support arbitrary sketch planes defined by any normal vector.

### 3. Export Functionality Not Exposed in UI

**Status:** Known Bug

The backend supports exporting to STEP, STL, OBJ, and IGES formats, but there's no UI to trigger an export. Should be added to the command palette.

### 4. Boolean Operations Not Exposed in UI

**Status:** Known Bug

The backend supports union, cut, and intersect boolean operations between shapes, but there's no UI flow for selecting two shapes and applying a boolean operation.

### 5. Linear/Mirror Array Not Exposed in UI

**Status:** Known Bug

Backend supports creating linear arrays (copy elements in a pattern) and mirror arrays, but no UI flow exists for these operations.

### 6. Constraint System - Phase 3 Complete

**Status:** In Progress

Phases 1-3 of the constraint system are implemented:
- ✅ Backend constraint solver (Newton-Raphson)
- ✅ Length, horizontal, vertical constraints
- ✅ API endpoints for constraint CRUD
- ✅ Dimension integration (Phase 2)
- ✅ H/V constraint inference and UI (Phase 3)
- ⏳ Phase 4: Coincident constraints
- ⏳ Phase 5: Perpendicular/Parallel constraints

See `Docs/plans/2026-02-01-constraint-system-design.md` for full design.

### 7. Session Persistence

**Status:** Architecture

Sessions are in-memory only (Python `SessionManager` uses a dict). Closing the browser or restarting the server loses all work. No save/load functionality exists.

### 8. Agent WebSocket Message Handling

**Status:** Partially Fixed

The `data` vs `payload` inconsistency has been fixed. Agent message handling now consistently uses:
- `message.data.content` for `agent_message` type (chat responses)
- `message.payload` for `geometry_update` and `visualization_data`

The data flow through the agent path still needs end-to-end testing.

---

## Priority Order (Suggested)

1. **Export** - Users need to get their work out
2. **Undo/Redo** - Expected in any design tool
3. **Sketch-on-Face normal mapping** - Limits 3D modeling capability
4. **Boolean operations** - Advanced 3D modeling
5. **Linear/Mirror arrays** - Pattern creation
6. **Constraint system** - Parametric modeling
7. **Session persistence** - Save/load
